import { resolve } from "node:path";
import { loadMainzConfig, normalizeMainzConfig } from "../../src/config/index.ts";
import {
    applyEngineBuildOverrides,
    resolveEngineBuildJobs,
    resolveEngineBuildProfile,
    runEngineBuildJobs,
} from "../../src/build/index.ts";
import { resolveForcedBuildJobs } from "../../src/build/testing.ts";
import type {
    FixtureTargetDefinition,
    TestBuildCombination,
    TestBuildContext,
    TestNavigationMode,
    TestRenderMode,
} from "./types.ts";
import { cliTestsRepoRoot } from "./types.ts";

const engineBuildLocks = new Map<string, Promise<void>>();
const fixtureCleanupRetryDelaysMs = [25, 75, 150] as const;

export async function buildRoutedAppForCombination(
    combination: TestBuildCombination,
): Promise<TestBuildContext> {
    return await buildNamedFixtureForCombination({
        fixtureName: "routed-app",
        targetName: "routed-app",
        combination,
    });
}

export async function buildRootAppForCombination(
    combination: TestBuildCombination,
): Promise<TestBuildContext> {
    return await buildNamedFixtureForCombination({
        fixtureName: "root-app",
        targetName: "root-app",
        combination,
    });
}

export async function buildRoutedDiEntriesAppForCombination(
    combination: TestBuildCombination,
): Promise<TestBuildContext> {
    return await buildNamedFixtureForCombination({
        fixtureName: "routed-di-app",
        targetName: "routed-di-app",
        combination,
    });
}

export async function buildRoutedDiClientAppForCombination(
    combination: TestBuildCombination,
): Promise<TestBuildContext> {
    return await buildNamedFixtureForCombination({
        fixtureName: "routed-di-client-app",
        targetName: "routed-di-client-app",
        combination,
    });
}

export async function buildRoutedAuthorizationAppForCombination(
    combination: TestBuildCombination,
): Promise<TestBuildContext> {
    return await buildNamedFixtureForCombination({
        fixtureName: "routed-authorization-app",
        targetName: "routed-authorization-app",
        combination,
    });
}

export async function buildBasePathAppForCombination(
    combination: TestBuildCombination,
): Promise<TestBuildContext> {
    return await buildNamedFixtureForCombination({
        fixtureName: "base-path",
        targetName: "base-path-app",
        combination,
        profile: "gh-pages",
    });
}

export async function buildHeadSeoAppForCombination(
    combination: TestBuildCombination,
): Promise<TestBuildContext> {
    return await buildNamedFixtureForCombination({
        fixtureName: "head-seo",
        targetName: "head-seo-app",
        combination,
    });
}

export async function buildNavigationOverrideAppForCombination(
    combination: TestBuildCombination,
): Promise<TestBuildContext> {
    const fixture = await createFixtureTargetDefinition({
        fixtureName: "navigation-override",
        targetName: "navigation-override-app",
    });

    const context = await buildFixtureForCombination({
        fixture,
        combination,
        profile: "plain-static",
    });

    return {
        ...context,
        cleanup: fixture.cleanup,
    };
}

export async function buildGeneratedTagStabilityAppForCombination(
    combination: TestBuildCombination,
): Promise<TestBuildContext> {
    const fixture = await createFixtureTargetDefinition({
        fixtureName: "custom-element-generated-tag-stability",
        targetName: "generated-tag-stability-app",
    });

    const context = await buildFixtureForCombination({
        fixture,
        combination,
    });

    return {
        ...context,
        cleanup: fixture.cleanup,
    };
}

export async function buildSingleLocaleRoutedAppForCombination(
    combination: TestBuildCombination,
): Promise<TestBuildContext> {
    const fixture = await createFixtureTargetDefinition({
        fixtureName: "single-locale-routing",
        targetName: "single-locale-routed-app",
    });

    const context = await buildFixtureForCombination({
        fixture,
        combination,
    });

    return {
        ...context,
        cleanup: fixture.cleanup,
    };
}

export async function buildDocumentLanguageRoutedAppForCombination(
    combination: TestBuildCombination,
): Promise<TestBuildContext> {
    const fixture = await createFixtureTargetDefinition({
        fixtureName: "document-language-routing",
        targetName: "document-language-routed-app",
    });

    const context = await buildFixtureForCombination({
        fixture,
        combination,
    });

    return {
        ...context,
        cleanup: fixture.cleanup,
    };
}

export async function buildFixtureForCombination(args: {
    fixture: Pick<FixtureTargetDefinition, "target" | "fixtureRoot" | "outputDir" | "targetName">;
    combination: TestBuildCombination;
    profile?: string;
}): Promise<TestBuildContext> {
    await runFixtureBuildForCombination(args);

    return {
        fixtureName: args.fixture.targetName,
        fixtureRoot: args.fixture.fixtureRoot,
        outputDir: resolve(args.fixture.outputDir, args.combination.mode),
        targetName: args.fixture.targetName,
        mode: args.combination.mode,
        navigation: args.combination.navigation,
        profile: args.profile,
    };
}

export async function buildTargetWithEngine(args: {
    targetName: string;
    mode?: TestRenderMode;
    navigation?: TestNavigationMode;
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
            const selectedTarget = normalizedConfig.targets.find((target) => target.name === args.targetName);
            if (!selectedTarget) {
                throw new Error(
                    `No targets matched "${args.targetName}". Available targets: ${
                        normalizedConfig.targets.map((target) => target.name).join(", ")
                    }`,
                );
            }

            const resolvedProfile = applyEngineBuildOverrides(
                await resolveEngineBuildProfile(selectedTarget, args.profile, cwd),
                { navigation: args.navigation },
            );

            const resolvedJobs = args.mode
                ? (await resolveForcedBuildJobs(
                    normalizedConfig,
                    {
                        configPath: args.configPath,
                        target: args.targetName,
                        profile: args.profile,
                        navigation: args.navigation,
                        mode: args.mode,
                    },
                    cwd,
                )).map((job) => ({
                    ...job,
                    profile: job.target.name === selectedTarget.name
                        ? resolvedProfile
                        : job.profile,
                }))
                : (await resolveEngineBuildJobs(
                    normalizedConfig,
                    {
                        configPath: args.configPath,
                        target: args.targetName,
                        profile: args.profile,
                        navigation: args.navigation,
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
                `Failed to build ${args.targetName}${args.mode ? ` for ${args.mode}` : ""}${
                    args.navigation ? ` + ${args.navigation}` : ""
                }: ${details}`,
            );
        }
    });
}

async function runFixtureBuildForCombination(args: {
    fixture: Pick<FixtureTargetDefinition, "target" | "fixtureRoot" | "outputDir" | "targetName">;
    combination: TestBuildCombination;
    profile?: string;
}): Promise<void> {
    await buildFixtureTargetWithEngine({
        target: args.fixture.target,
        mode: args.combination.mode,
        navigation: args.combination.navigation,
        profile: args.profile,
        cwd: cliTestsRepoRoot,
    });
}

export async function createFixtureTargetDefinition(args: {
    fixtureName: string;
    targetName?: string;
    appFile?: string;
    omitPagesDir?: boolean;
    authorizationPolicyNames?: readonly string[];
}): Promise<FixtureTargetDefinition> {
    const fixtureRoot = resolve(
        cliTestsRepoRoot,
        "tests",
        "fixtures",
        args.fixtureName,
    );
    const targetName = args.targetName ?? args.fixtureName;
    const tempRoot = await Deno.makeTempDir({
        dir: cliTestsRepoRoot,
        prefix: `.mainz-fixture-${args.fixtureName}-`,
    });
    const outputDir = resolve(tempRoot, "dist", targetName);
    const pagesDir = resolve(fixtureRoot, "src", "pages");
    const requestedAppFile = args.appFile
        ? resolve(fixtureRoot, args.appFile)
        : resolve(fixtureRoot, "src", "main.tsx");
    const viteConfig = resolve(fixtureRoot, "vite.config.ts");
    const buildConfigPath = resolve(fixtureRoot, "mainz.build.ts");
    const hasBuildConfig = await fileExists(buildConfigPath);
    const includeAppFile = args.appFile !== undefined || await fileExists(requestedAppFile);

    const authorizationPolicyNames = args.authorizationPolicyNames;
    const targetDefinition = {
        name: targetName,
        rootDir: fixtureRoot,
        viteConfig,
        ...(args.omitPagesDir ? {} : { pagesDir }),
        ...(includeAppFile ? { appFile: requestedAppFile } : {}),
        ...(hasBuildConfig ? { buildConfig: buildConfigPath } : {}),
        outDir: outputDir,
        ...(authorizationPolicyNames?.length
            ? {
                authorization: {
                    policyNames: [...authorizationPolicyNames],
                },
            }
            : {}),
    };
    const target = normalizeMainzConfig({
        targets: [targetDefinition],
    }).targets[0];

    return {
        target,
        targetDefinition,
        fixtureRoot,
        outputDir,
        targetName,
        async cleanup() {
            await removeFixtureTempDir(tempRoot);
        },
    };
}

async function buildNamedFixtureForCombination(args: {
    fixtureName: string;
    targetName: string;
    combination: TestBuildCombination;
    profile?: string;
}): Promise<TestBuildContext> {
    const fixture = await createFixtureTargetDefinition({
        fixtureName: args.fixtureName,
        targetName: args.targetName,
    });

    try {
        const context = await buildFixtureForCombination({
            fixture,
            combination: args.combination,
            profile: args.profile,
        });

        return {
            ...context,
            cleanup: fixture.cleanup,
        };
    } catch (error) {
        await fixture.cleanup();
        throw error;
    }
}

async function fileExists(path: string): Promise<boolean> {
    try {
        await Deno.stat(path);
        return true;
    } catch {
        return false;
    }
}

async function removeFixtureTempDir(path: string): Promise<void> {
    for (const delayMs of [0, ...fixtureCleanupRetryDelaysMs]) {
        try {
            await Deno.remove(path, { recursive: true });
            return;
        } catch (error) {
            if (!(error instanceof Deno.errors.NotFound)) {
                if (delayMs === fixtureCleanupRetryDelaysMs[fixtureCleanupRetryDelaysMs.length - 1]) {
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

async function buildFixtureTargetWithEngine(args: {
    target: FixtureTargetDefinition["target"];
    mode?: TestRenderMode;
    navigation?: TestNavigationMode;
    profile?: string;
    cwd?: string;
}): Promise<void> {
    const cwd = args.cwd ?? cliTestsRepoRoot;
    const normalizedConfig = { targets: [args.target] };
    const buildKey = [
        cwd,
        args.target.name,
        args.target.outDir,
    ].join("::");

    await withEngineBuildLock(buildKey, async () => {
        try {
            const resolvedProfile = applyEngineBuildOverrides(
                await resolveEngineBuildProfile(args.target, args.profile, cwd),
                { navigation: args.navigation },
            );

            const resolvedJobs = args.mode
                ? (await resolveForcedBuildJobs(
                    normalizedConfig,
                    {
                        target: args.target.name,
                        profile: args.profile,
                        navigation: args.navigation,
                        mode: args.mode,
                    },
                    cwd,
                )).map((job) => ({
                    ...job,
                    profile: resolvedProfile,
                }))
                : (await resolveEngineBuildJobs(
                    normalizedConfig,
                    {
                        target: args.target.name,
                        profile: args.profile,
                        navigation: args.navigation,
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
                `Failed to build ${args.target.name}${args.mode ? ` for ${args.mode}` : ""}${
                    args.navigation ? ` + ${args.navigation}` : ""
                }: ${details}`,
            );
        }
    });
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
