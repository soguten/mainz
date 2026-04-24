import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type {
    LoadedMainzConfig,
    MainzRuntime,
    NormalizedMainzConfig,
    NormalizedMainzTarget,
} from "../config/index.ts";
import { loadMainzConfig, normalizeMainzConfig } from "../config/index.ts";
import {
    resolveEngineBuildJobs,
    resolveEngineBuildProfile,
    resolveEnginePublicationMetadata,
    runEngineBuildJobs,
    runEngineDevServer,
} from "../build/index.ts";
import {
    collectDiagnosticsForConfig,
    formatDiagnosticsHuman,
    formatDiagnosticsJson,
    shouldFailDiagnostics,
} from "../diagnostics/index.ts";
import { serveArtifactPreview } from "../preview/artifact-server.ts";
import {
    type AppScaffoldNavigation,
    type AppScaffoldTarget,
    type AppScaffoldType,
    createAppScaffold,
} from "./scaffolds/index.ts";
import { createProjectEmptyScaffold } from "./scaffolds/index.ts";
import { denoToolingRuntime, nodeToolingRuntime } from "../tooling/runtime/index.ts";
import type { MainzToolingRuntime } from "../tooling/runtime/index.ts";
import { resolvePublishedMainzSpecifier } from "./package-version.ts";

type SharedCliOptions = {
    runtime?: MainzRuntime;
    target?: string;
    profile?: string;
    configPath?: string;
};

type CliHostOption = string | true;

type BuildCommandOptions = SharedCliOptions & {
    command: "build";
};

type DevCommandOptions = SharedCliOptions & {
    command: "dev";
    host?: CliHostOption;
    port?: number;
};

type PreviewCommandOptions = SharedCliOptions & {
    command: "preview";
    host?: CliHostOption;
    port?: number;
};

type TestCommandOptions = SharedCliOptions & {
    command: "test";
};

type PublishInfoCommandOptions = SharedCliOptions & {
    command: "publish-info";
};

type InitCommandOptions = {
    command: "init";
    runtime?: MainzRuntime;
    configPath?: string;
    denoConfigPath?: string;
    mainzSpecifier?: string;
};

type DiagnoseCommandOptions = SharedCliOptions & {
    command: "diagnose";
    app?: string;
    format?: "json" | "human";
    failOn?: "never" | "error" | "warning";
};

type AppCommandOptions = {
    command: "app";
    action: "create" | "remove";
    name: string;
    type?: AppScaffoldType;
    root?: string;
    outDir?: string;
    navigation?: AppScaffoldNavigation;
    runtime?: MainzRuntime;
    configPath?: string;
    deleteFiles?: boolean;
};

type MainzCliCommand =
    | InitCommandOptions
    | BuildCommandOptions
    | DevCommandOptions
    | PreviewCommandOptions
    | TestCommandOptions
    | PublishInfoCommandOptions
    | DiagnoseCommandOptions
    | AppCommandOptions;

type SupportedCliRuntime = "deno" | "node";

const projectConfigBootstrapEnv = "MAINZ_CLI_PROJECT_CONFIG_BOOTSTRAPPED";

class CliExitError extends Error {
    constructor(readonly code: number) {
        super(`CLI exited with code ${code}.`);
    }
}

if (import.meta.main) {
    Deno.exit(await runCliEntryPoint(Deno.args));
}

/**
 * Runs the Mainz command-line interface with the provided process arguments.
 */
export async function main(args: string[]): Promise<void> {
    const exitCode = await runCliEntryPoint(args);
    if (exitCode !== 0) {
        Deno.exit(exitCode);
    }
}

async function runCliEntryPoint(args: string[]): Promise<number> {
    try {
        return await runCli(args);
    } catch (error) {
        if (error instanceof CliExitError) {
            return error.code;
        }

        throw error;
    }
}

async function runCli(args: string[]): Promise<number> {
    const command = parseCliCommand(args);
    if (!command) {
        printHelp();
        return 0;
    }

    if (command.command === "init") {
        await runInitCommand(command);
        return 0;
    }

    if (command.command === "app") {
        await runAppCommand(command);
        return 0;
    }

    if (await rerunWithProjectBootstrapIfNeeded(command, args)) {
        return 0;
    }

    const runtime = await resolveCommandToolingRuntime(command);
    const loadedConfig = await loadMainzConfig(command.configPath, runtime);
    const normalizedConfig = normalizeMainzConfig(loadedConfig.config);

    switch (command.command) {
        case "publish-info":
            await runPublishInfoCommand(command, normalizedConfig, runtime);
            return 0;
        case "diagnose":
            return await runDiagnoseCommand(command, normalizedConfig, runtime);
        case "dev":
            await runDevCommand(command, loadedConfig, normalizedConfig, runtime);
            return 0;
        case "preview":
            await runPreviewCommand(command, loadedConfig, normalizedConfig, runtime);
            return 0;
        case "test":
            return await runTestCommand(command, normalizedConfig, runtime);
        case "build":
            await runBuildCommand(command, loadedConfig, normalizedConfig, runtime);
            return 0;
    }
}

async function rerunWithProjectBootstrapIfNeeded(
    command:
        | BuildCommandOptions
        | DevCommandOptions
        | PreviewCommandOptions
        | TestCommandOptions
        | PublishInfoCommandOptions
        | DiagnoseCommandOptions,
    args: readonly string[],
): Promise<boolean> {
    const runtime = denoToolingRuntime;
    if (getCliBootstrapEnv() === "1") {
        return false;
    }

    const projectRuntime = await resolveProjectRuntimePreference(command);
    if (projectRuntime === "node") {
        const bootstrap = await createNodeProjectBootstrapConfig(
            command.configPath ?? "mainz.config.ts",
        );
        if (!bootstrap) {
            return false;
        }

        try {
            const status = await runtime.run({
                command: "deno",
                cwd: runtime.cwd(),
                args: [
                    "run",
                    "-A",
                    "--config",
                    bootstrap.configPath,
                    import.meta.url,
                    ...args,
                ],
                env: {
                    [projectConfigBootstrapEnv]: "1",
                },
                stdin: "inherit",
                stdout: "inherit",
                stderr: "inherit",
            });
            if (!status.success) {
                throw new CliExitError(status.code);
            }

            return true;
        } finally {
            await runtime.remove(bootstrap.tempDir, { recursive: true });
        }
    }

    const denoConfigPath = await findNearestDenoConfig(command.configPath ?? "mainz.config.ts");
    if (!denoConfigPath) {
        return false;
    }

    const status = await runtime.run({
        command: "deno",
        cwd: runtime.cwd(),
        args: [
            "run",
            "-A",
            "--config",
            denoConfigPath,
            import.meta.url,
            ...args,
        ],
        env: {
            [projectConfigBootstrapEnv]: "1",
        },
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
    });
    if (!status.success) {
        throw new CliExitError(status.code);
    }

    return true;
}

async function createNodeProjectBootstrapConfig(
    configPath: string,
): Promise<{ configPath: string; tempDir: string } | undefined> {
    const absoluteConfigPath = resolve(configPath);
    const projectDir = dirname(absoluteConfigPath);
    const packageJsonPath = resolve(projectDir, "package.json");
    if (!(await pathExists(packageJsonPath))) {
        return undefined;
    }

    const packageJson = JSON.parse(await denoToolingRuntime.readTextFile(packageJsonPath)) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
    };
    const mainzDependency = packageJson.dependencies?.mainz ?? packageJson.devDependencies?.mainz;
    const mainzImports = resolveBootstrapMainzImports(mainzDependency);
    if (!mainzImports) {
        throw new Error(
            `Could not resolve the Mainz package version from "${packageJsonPath}".`,
        );
    }

    const tempDir = await denoToolingRuntime.makeTempDir({ prefix: "mainz-node-bootstrap-" });
    const bootstrapConfigPath = resolve(tempDir, "deno.json");
    await denoToolingRuntime.writeTextFile(
        bootstrapConfigPath,
        JSON.stringify(
            {
                compilerOptions: {
                    jsx: "react-jsx",
                    jsxImportSource: "mainz",
                },
                imports: {
                    ...mainzImports,
                    vite: "npm:vite@7.3.1",
                    "@deno/vite-plugin": "npm:@deno/vite-plugin@2.0.2",
                    "happy-dom": "npm:happy-dom@20.1.0",
                },
            },
            null,
            4,
        ),
    );

    return {
        configPath: bootstrapConfigPath,
        tempDir,
    };
}

async function findNearestDenoConfig(configPath: string): Promise<string | undefined> {
    let current = dirname(resolve(configPath));

    while (true) {
        for (const fileName of ["deno.json", "deno.jsonc"]) {
            const candidate = resolve(current, fileName);
            if (await pathExists(candidate)) {
                return candidate;
            }
        }

        const parent = dirname(current);
        if (parent === current) {
            return undefined;
        }

        current = parent;
    }
}

function parseCliCommand(args: string[]): MainzCliCommand | undefined {
    const { runtime, remainingArgs } = parseGlobalCliOptions(args);
    const [command, ...rest] = remainingArgs;

    if (!command || command === "help" || command === "--help" || command === "-h") {
        return undefined;
    }

    if (
        command !== "build" && command !== "dev" && command !== "preview" && command !== "test" &&
        command !== "publish-info" &&
        command !== "diagnose" &&
        command !== "app" &&
        command !== "init"
    ) {
        throw new Error(
            `Unknown command "${command}". Use "init", "build", "dev", "preview", "test", "publish-info", "diagnose", or "app".`,
        );
    }

    if (command === "init") {
        return parseInitCommand(rest, runtime);
    }

    if (command === "app") {
        return parseAppCommand(rest, runtime);
    }

    const options = parseCommandOptions(command, rest, runtime);

    if (command === "build") {
        return { command, ...options };
    }

    if (command === "publish-info") {
        return { command, ...options };
    }

    if (command === "dev") {
        return { command, ...options };
    }

    if (command === "preview") {
        return { command, ...options };
    }

    if (command === "test") {
        return { command, ...options };
    }

    return {
        command,
        ...options,
        format: options.format,
        failOn: options.failOn,
    };
}

function parseGlobalCliOptions(args: readonly string[]): {
    runtime?: MainzRuntime;
    remainingArgs: string[];
} {
    const remainingArgs: string[] = [];
    let runtime: MainzRuntime | undefined;

    for (let index = 0; index < args.length; index += 1) {
        const current = args[index];
        if (current === "--runtime") {
            runtime = parseRuntimeOption(args[index + 1]);
            index += 1;
            continue;
        }

        remainingArgs.push(current);
    }

    return { runtime, remainingArgs };
}

function parseInitCommand(
    args: string[],
    inheritedRuntime?: MainzRuntime,
): InitCommandOptions {
    const options: Omit<InitCommandOptions, "command"> = {
        runtime: inheritedRuntime,
    };

    for (let index = 0; index < args.length; index += 1) {
        const current = args[index];

        if (current === "--config") {
            options.configPath = readOptionValue(current, args[index + 1]);
            index += 1;
            continue;
        }

        if (current === "--deno-config") {
            options.denoConfigPath = readOptionValue(current, args[index + 1]);
            index += 1;
            continue;
        }

        if (current === "--mainz") {
            options.mainzSpecifier = readOptionValue(current, args[index + 1]);
            index += 1;
            continue;
        }

        if (current === "--runtime") {
            options.runtime = parseRuntimeOption(args[index + 1]);
            index += 1;
            continue;
        }

        throw new Error(`Unknown option "${current}".`);
    }

    return {
        command: "init",
        ...options,
    };
}

function parseAppCommand(
    args: string[],
    inheritedRuntime?: MainzRuntime,
): AppCommandOptions {
    const [action, maybeName, ...rest] = args;

    if (action !== "create" && action !== "remove") {
        throw new Error('Command "app" requires "create" or "remove".');
    }

    const positionalName = maybeName?.startsWith("--") ? undefined : maybeName;
    const remaining = positionalName ? rest : [maybeName, ...rest].filter(Boolean);

    const options: Pick<
        AppCommandOptions,
        "type" | "root" | "outDir" | "navigation" | "configPath" | "deleteFiles" | "runtime"
    > = {
        runtime: inheritedRuntime,
    };
    let flagName: string | undefined;

    for (let index = 0; index < remaining.length; index += 1) {
        const current = remaining[index];

        if (current === "--name" && action === "create") {
            flagName = readOptionValue(current, remaining[index + 1]);
            index += 1;
            continue;
        }

        if (current === "--target" && action === "remove") {
            flagName = readOptionValue(current, remaining[index + 1]);
            index += 1;
            continue;
        }

        if (current === "--type") {
            options.type = parseAppType(remaining[index + 1]);
            index += 1;
            continue;
        }

        if (current === "--root") {
            options.root = readOptionValue(current, remaining[index + 1]);
            index += 1;
            continue;
        }

        if (current === "--out-dir") {
            options.outDir = readOptionValue(current, remaining[index + 1]);
            index += 1;
            continue;
        }

        if (current === "--navigation") {
            options.navigation = parseAppNavigation(remaining[index + 1]);
            index += 1;
            continue;
        }

        if (current === "--config") {
            options.configPath = readOptionValue(current, remaining[index + 1]);
            index += 1;
            continue;
        }

        if (current === "--runtime") {
            options.runtime = parseRuntimeOption(remaining[index + 1]);
            index += 1;
            continue;
        }

        if (current === "--delete-files" && action === "remove") {
            options.deleteFiles = true;
            continue;
        }

        throw new Error(`Unknown option "${current}".`);
    }

    const name = resolveAppCommandName(action, positionalName, flagName);

    return {
        command: "app",
        action,
        name,
        ...options,
    };
}

function resolveAppCommandName(
    action: AppCommandOptions["action"],
    positionalName: string | undefined,
    flagName: string | undefined,
): string {
    if (positionalName?.trim() && flagName?.trim() && positionalName.trim() !== flagName.trim()) {
        throw new Error(
            `Command "app ${action}" received conflicting names "${positionalName}" and "${flagName}".`,
        );
    }

    const resolved = flagName?.trim() || positionalName?.trim();
    if (!resolved) {
        throw new Error(`Command "app ${action}" requires a name.`);
    }

    return resolved;
}

function readOptionValue(option: string, value: string | undefined): string {
    if (!value?.trim()) {
        throw new Error(`Option "${option}" requires a value.`);
    }

    return value;
}

function parseAppNavigation(value: string | undefined): AppCommandOptions["navigation"] {
    if (value === "spa" || value === "mpa" || value === "enhanced-mpa") {
        return value;
    }

    throw new Error(
        `Unsupported app navigation "${value ?? ""}". Use "spa", "mpa", or "enhanced-mpa".`,
    );
}

function parseAppType(value: string | undefined): AppScaffoldType {
    if (value === "routed" || value === "root") {
        return value;
    }

    throw new Error(`Unsupported app type "${value ?? ""}". Use "routed" or "root".`);
}

function parseRuntimeOption(value: string | undefined): MainzRuntime {
    if (value === "deno" || value === "node" || value === "bun") {
        return value;
    }

    throw new Error(
        `Unsupported runtime "${value ?? ""}". Use "deno", "node", or "bun".`,
    );
}

function parseCommandOptions(
    command: Exclude<MainzCliCommand["command"], "app">,
    args: string[],
    inheritedRuntime?: MainzRuntime,
):
    & SharedCliOptions
    & Pick<DiagnoseCommandOptions, "app" | "format" | "failOn">
    & Pick<DevCommandOptions, "host" | "port"> {
    const options:
        & SharedCliOptions
        & Pick<DiagnoseCommandOptions, "app" | "format" | "failOn">
        & Pick<DevCommandOptions, "host" | "port"> = {
            runtime: inheritedRuntime,
        };

    for (let index = 0; index < args.length; index += 1) {
        const current = args[index];

        if (current === "--target") {
            options.target = args[index + 1];
            index += 1;
            continue;
        }

        if (current === "--profile") {
            options.profile = args[index + 1];
            index += 1;
            continue;
        }

        if (current === "--config") {
            options.configPath = args[index + 1];
            index += 1;
            continue;
        }

        if (current === "--runtime") {
            options.runtime = parseRuntimeOption(args[index + 1]);
            index += 1;
            continue;
        }

        if (current === "--format") {
            options.format = args[index + 1] as "json" | "human" | undefined;
            index += 1;
            continue;
        }

        if (current === "--app") {
            options.app = args[index + 1];
            index += 1;
            continue;
        }

        if (current === "--fail-on") {
            options.failOn = args[index + 1] as "never" | "error" | "warning" | undefined;
            index += 1;
            continue;
        }

        if (current === "--host") {
            if (command !== "dev" && command !== "preview") {
                throw new Error(`Unknown option "${current}".`);
            }

            const nextValue = args[index + 1];
            if (nextValue?.trim() && !nextValue.startsWith("--")) {
                options.host = nextValue;
                index += 1;
            } else {
                options.host = true;
            }
            continue;
        }

        if (current === "--port") {
            if (command !== "dev" && command !== "preview") {
                throw new Error(`Unknown option "${current}".`);
            }

            const nextValue = args[index + 1];
            const parsedPort = Number(nextValue);
            if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
                throw new Error(`Invalid --port value "${nextValue ?? ""}".`);
            }

            options.port = parsedPort;
            index += 1;
            continue;
        }

        if (current === "--suite") {
            throw new Error(
                `Unknown option "${current}". Test suites are project-specific; keep them in deno.json tasks.`,
            );
        }

        throw new Error(`Unknown option "${current}".`);
    }

    return options;
}

async function runInitCommand(options: InitCommandOptions): Promise<void> {
    const projectRuntime = resolveSupportedCliRuntime(options.runtime ?? "deno");
    const runtime = resolveToolingRuntime(projectRuntime);
    const configPath = options.configPath ?? "mainz.config.ts";
    const denoConfigPath = options.denoConfigPath ?? "deno.json";
    const mainzSpecifier = options.mainzSpecifier ??
        await resolvePublishedMainzSpecifier(import.meta.url);
    const scaffold = createProjectEmptyScaffold({
        runtime: projectRuntime === "node" ? "node" : "deno",
        mainzSpecifier,
        configPath,
        denoConfigPath,
    });

    await assertCanCreateFiles([...scaffold.files.keys()], runtime);
    for (const [path, content] of scaffold.files) {
        await writeNewTextFile(path, content, runtime);
    }

    console.log(`[mainz] Initialized Mainz project in ${runtime.cwd()}.`);
    console.log(`[mainz] Created ${Array.from(scaffold.files.keys()).join(", ")}.`);
    console.log('[mainz] Add an app with "mainz app create <name>".');
}

async function runAppCommand(options: AppCommandOptions): Promise<void> {
    if (options.action === "create") {
        await runAppCreateCommand(options);
        return;
    }

    await runAppRemoveCommand(options);
}

async function runAppCreateCommand(options: AppCommandOptions): Promise<void> {
    const projectRuntime = await resolveProjectRuntimePreference(options);
    const runtime = resolveToolingRuntime(projectRuntime);
    const appName = normalizeAppName(options.name);
    const rootDir = normalizeAppRoot(options.root ?? `./${appName}`);
    const rootPath = resolve(rootDir);
    const outDir = normalizeOutDir(options.outDir ?? `dist/${appName}`);
    const configPath = options.configPath ?? "mainz.config.ts";
    const scaffold = createAppScaffold({
        type: options.type ?? "routed",
        name: appName,
        rootDir,
        outDir,
        navigation: options.navigation ?? "enhanced-mpa",
        runtime: projectRuntime,
    });

    for (const relativePath of scaffold.files.keys()) {
        const path = resolve(rootPath, relativePath);
        if (await pathExists(path, runtime)) {
            throw new Error(`Refusing to overwrite existing file "${path}".`);
        }
    }

    for (const directory of scaffold.directories) {
        await runtime.mkdir(resolve(rootPath, directory), { recursive: true });
    }

    for (const [relativePath, content] of scaffold.files) {
        await runtime.writeTextFile(resolve(rootPath, relativePath), content);
    }

    await upsertConfigTarget(
        configPath,
        renderConfigTarget(scaffold.target),
        projectRuntime,
        runtime,
    );

    console.log(`[mainz] Created app "${appName}" in ${rootDir}.`);
}

async function runAppRemoveCommand(options: AppCommandOptions): Promise<void> {
    const runtime = denoToolingRuntime;
    const appName = normalizeAppName(options.name);
    const configPath = options.configPath ?? "mainz.config.ts";
    const absoluteConfigPath = resolve(configPath);
    const content = await runtime.readTextFile(absoluteConfigPath);
    const targetSource = findConfigTargetSource(content, appName);
    const updated = removeConfigTarget(content, appName);

    if (updated === content) {
        throw new Error(`No target named "${appName}" found in ${configPath}.`);
    }

    if (options.deleteFiles) {
        const rootDir = targetSource ? extractTargetRootDir(targetSource) : undefined;
        if (!rootDir) {
            throw new Error(
                `Target "${appName}" does not define rootDir, so files were not deleted.`,
            );
        }

        await removeAppRoot(rootDir, runtime);
    }

    await runtime.writeTextFile(absoluteConfigPath, updated);
    console.log(`[mainz] Removed app target "${appName}" from ${configPath}.`);

    if (options.deleteFiles) {
        console.log(`[mainz] Deleted app files for "${appName}".`);
    }
}

async function runBuildCommand(
    options: BuildCommandOptions,
    loadedConfig: LoadedMainzConfig,
    normalizedConfig: NormalizedMainzConfig,
    runtime: MainzToolingRuntime,
): Promise<void> {
    const cwd = runtime.cwd();
    const jobs = await resolveEngineBuildJobs(normalizedConfig, options, cwd);
    const selectedTargets = new Map(jobs.map((job) => [job.target.name, job.target]));
    const resolvedProfileByTarget = new Map<
        string,
        Awaited<ReturnType<typeof resolveEngineBuildProfile>>
    >();
    for (const target of selectedTargets.values()) {
        resolvedProfileByTarget.set(
            target.name,
            await resolveEngineBuildProfile(target, options.profile, cwd),
        );
    }

    const resolvedJobs = jobs.map((job) => ({
        ...job,
        profile: resolvedProfileByTarget.get(job.target.name)!,
    }));

    console.log(
        `[mainz] Building ${resolvedJobs.length} job(s) using config ${loadedConfig.path}`,
    );

    await runEngineBuildJobs(normalizedConfig, resolvedJobs, cwd, runtime);

    console.log("[mainz] Build completed successfully.");
}

async function runPublishInfoCommand(
    options: PublishInfoCommandOptions,
    normalizedConfig: NormalizedMainzConfig,
    runtime: MainzToolingRuntime,
): Promise<void> {
    const cwd = runtime.cwd();
    const target = resolveRequiredTarget(normalizedConfig, options.target, "publish-info");
    const metadata = await resolveEnginePublicationMetadata(
        target,
        options.profile,
        cwd,
    );
    console.log(JSON.stringify(metadata, null, 2));
}

async function runDevCommand(
    options: DevCommandOptions,
    loadedConfig: LoadedMainzConfig,
    normalizedConfig: NormalizedMainzConfig,
    runtime: MainzToolingRuntime,
): Promise<void> {
    const cwd = runtime.cwd();
    const target = resolveRequiredTarget(normalizedConfig, options.target, "dev");
    const profile = await resolveEngineBuildProfile(target, options.profile, cwd);

    console.log(
        `[mainz] Starting dev server for target "${target.name}" using config ${loadedConfig.path}`,
    );

    await runEngineDevServer(normalizedConfig, target, profile, {
        host: options.host,
        port: options.port,
    }, cwd, runtime);
}

async function runPreviewCommand(
    options: PreviewCommandOptions,
    loadedConfig: LoadedMainzConfig,
    normalizedConfig: NormalizedMainzConfig,
    runtime: MainzToolingRuntime,
): Promise<void> {
    const cwd = runtime.cwd();
    const target = resolveRequiredTarget(normalizedConfig, options.target, "preview");

    await runBuildCommand(
        {
            command: "build",
            target: target.name,
            profile: options.profile,
            configPath: options.configPath,
        },
        loadedConfig,
        normalizedConfig,
        runtime,
    );

    const metadata = await resolveEnginePublicationMetadata(
        target,
        options.profile,
        cwd,
    );

    serveArtifactPreview({
        rootDir: metadata.outDir,
        host: options.host === true ? "0.0.0.0" : options.host,
        port: options.port,
    });

    await new Promise(() => undefined);
}

async function runDiagnoseCommand(
    options: DiagnoseCommandOptions,
    normalizedConfig: NormalizedMainzConfig,
    runtime: MainzToolingRuntime,
): Promise<number> {
    const cwd = runtime.cwd();
    const diagnostics = await collectDiagnosticsForConfig(
        normalizedConfig,
        options,
        cwd,
    );
    const format = resolveDiagnoseFormat(options.format);
    console.log(
        format === "human"
            ? formatDiagnosticsHuman(diagnostics)
            : formatDiagnosticsJson(diagnostics),
    );
    if (shouldFailDiagnostics(diagnostics, resolveDiagnoseFailOn(options.failOn))) {
        return 1;
    }

    return 0;
}

async function runTestCommand(
    options: TestCommandOptions,
    normalizedConfig: NormalizedMainzConfig,
    runtime: MainzToolingRuntime,
): Promise<number> {
    if (runtime.name !== "deno") {
        throw new Error('Command "test" is not implemented yet for runtime "node".');
    }

    const cwd = runtime.cwd();
    const testPaths = resolveTestPathsForTarget(normalizedConfig, options.target, cwd);
    const status = await runtime.run({
        command: "deno",
        cwd,
        args: [
            "test",
            "-A",
            ...testPaths,
        ],
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
    });
    if (!status.success) {
        return status.code;
    }

    return 0;
}

function resolveRequiredTarget(
    config: NormalizedMainzConfig,
    targetName: string | undefined,
    command: "dev" | "preview" | "publish-info",
): NormalizedMainzTarget {
    const normalizedTargetName = targetName?.trim();
    if (!normalizedTargetName || normalizedTargetName === "all") {
        throw new Error(`Command "${command}" requires a single --target <name>.`);
    }

    const target = config.targets.find((entry) => entry.name === normalizedTargetName);
    if (!target) {
        throw new Error(
            `No targets matched "${normalizedTargetName}". Available targets: ${
                config.targets.map((entry) => entry.name).join(", ")
            }`,
        );
    }

    return target;
}

function printHelp(): void {
    console.log(
        [
            "Mainz CLI",
            "",
            "Usage:",
            "  mainz [--runtime <deno|node|bun>] init [--config <path>] [--deno-config <path>] [--mainz <specifier>]",
            "  mainz [--runtime <deno|node|bun>] app create [<name>|--name <name>] [--type <routed|root>] [--root <path>] [--out-dir <path>] [--navigation <spa|mpa|enhanced-mpa>] [--config <path>]",
            "  mainz [--runtime <deno|node|bun>] app remove [<target>|--target <target>] [--delete-files] [--config <path>]",
            "  mainz [--runtime <deno|node|bun>] build [--target <name|all>] [--profile <name>] [--config <path>]",
            "  mainz [--runtime <deno|node|bun>] dev --target <name> [--profile <name>] [--host [host]] [--port <port>] [--config <path>]",
            "  mainz [--runtime <deno|node|bun>] preview --target <name> [--profile <name>] [--host [host]] [--port <port>] [--config <path>]",
            "  mainz [--runtime <deno|node|bun>] test [--target <name|all>] [--config <path>]",
            "  mainz [--runtime <deno|node|bun>] publish-info --target <name> [--profile <name>] [--config <path>]",
            "  mainz [--runtime <deno|node|bun>] diagnose [--target <name|all>] [--app <id>] [--format <json|human>] [--fail-on <never|error|warning>] [--config <path>]",
            "",
            "Examples:",
            "  mainz init",
            "  mainz --runtime node init",
            "  mainz init --mainz jsr:@mainz/mainz@<version>",
            "  mainz app create site",
            "  mainz app create --name site",
            "  mainz app create docs --navigation enhanced-mpa",
            "  mainz app create portal --type root",
            "  mainz app remove site",
            "  mainz app remove --target site",
            "  mainz build",
            "  mainz build --target site --profile gh-pages",
            "  mainz build --target playground",
            "  mainz dev --target playground",
            "  mainz dev --target site --host",
            "  mainz preview --target site --profile production",
            "  mainz test --target site",
            "  mainz publish-info --target site --profile gh-pages",
            "  mainz diagnose",
            "  mainz diagnose --target docs",
            "  mainz diagnose --target docs --app site",
            "  mainz diagnose --target docs --format human",
            "  mainz diagnose --target docs --format human --fail-on error",
        ].join("\n"),
    );
}

function resolveDiagnoseFormat(format: string | undefined): "json" | "human" {
    const normalized = format?.trim();
    if (!normalized || normalized === "json") {
        return "json";
    }

    if (normalized === "human") {
        return "human";
    }

    throw new Error(`Unsupported diagnose format "${format}". Use "json" or "human".`);
}

function resolveTestPathsForTarget(
    config: NormalizedMainzConfig,
    targetName: string | undefined,
    cwd: string,
): string[] {
    const normalizedTargetName = targetName?.trim();
    if (!normalizedTargetName) {
        return [];
    }

    if (normalizedTargetName === "all") {
        return Array.from(
            new Set(
                config.targets.map((target) => normalizePathSlashes(resolve(cwd, target.rootDir))),
            ),
        );
    }

    const target = config.targets.find((entry) => entry.name === normalizedTargetName);
    if (!target) {
        throw new Error(
            `No targets matched "${normalizedTargetName}". Available targets: ${
                config.targets.map((entry) => entry.name).join(", ")
            }`,
        );
    }

    return [normalizePathSlashes(resolve(cwd, target.rootDir))];
}

function normalizePathSlashes(path: string): string {
    return path.replaceAll("\\", "/");
}

function resolveDiagnoseFailOn(
    failOn: string | undefined,
): "never" | "error" | "warning" {
    const normalized = failOn?.trim();
    if (!normalized || normalized === "never") {
        return "never";
    }

    if (normalized === "error" || normalized === "warning") {
        return normalized;
    }

    throw new Error(
        `Unsupported diagnose fail mode "${failOn}". Use "never", "error", or "warning".`,
    );
}

function normalizeAppName(name: string): string {
    const normalized = name.trim();
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(normalized)) {
        throw new Error(
            `Invalid app name "${name}". Use letters, numbers, dashes, or underscores, starting with a letter.`,
        );
    }

    return normalized;
}

function normalizeAppRoot(root: string): string {
    const normalized = normalizePathSlashes(root.trim()).replace(/\/+$/, "");
    if (!normalized) {
        throw new Error("App root must not be empty.");
    }

    if (isAbsolute(normalized)) {
        throw new Error("App root must be a relative path.");
    }

    return normalized.startsWith(".") ? normalized : `./${normalized}`;
}

function normalizeOutDir(outDir: string): string {
    const normalized = normalizePathSlashes(outDir.trim()).replace(/\/+$/, "");
    if (!normalized) {
        throw new Error("App outDir must not be empty.");
    }

    if (isAbsolute(normalized)) {
        throw new Error("App outDir must be a relative path.");
    }

    return normalized.startsWith(".") ? normalized.slice(2) : normalized;
}

async function upsertConfigTarget(
    configPath: string,
    target: string,
    projectRuntime: "deno" | "node" = "deno",
    runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<void> {
    const absoluteConfigPath = resolve(configPath);

    if (!(await pathExists(absoluteConfigPath, runtime))) {
        await runtime.mkdir(dirname(absoluteConfigPath), { recursive: true });
        await runtime.writeTextFile(
            absoluteConfigPath,
            renderGeneratedConfig(target, projectRuntime),
        );
        return;
    }

    const content = await runtime.readTextFile(absoluteConfigPath);
    await runtime.writeTextFile(absoluteConfigPath, insertConfigTarget(content, target));
}

async function writeNewTextFile(
    path: string,
    content: string,
    runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<void> {
    const absolutePath = resolve(path);
    if (await pathExists(absolutePath, runtime)) {
        throw new Error(`Refusing to overwrite existing file "${absolutePath}".`);
    }

    await runtime.mkdir(dirname(absolutePath), { recursive: true });
    await runtime.writeTextFile(absolutePath, content);
}

async function assertCanCreateFiles(
    paths: string[],
    runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<void> {
    for (const path of paths) {
        const absolutePath = resolve(path);
        if (await pathExists(absolutePath, runtime)) {
            throw new Error(`Refusing to overwrite existing file "${absolutePath}".`);
        }
    }
}

function renderGeneratedConfig(
    target: string,
    projectRuntime: "deno" | "node" = "deno",
): string {
    return [
        'import { defineMainzConfig } from "mainz/config";',
        "",
        "export default defineMainzConfig({",
        `    runtime: ${JSON.stringify(projectRuntime)},`,
        "    targets: [",
        target,
        "    ],",
        "});",
        "",
    ].join("\n");
}

function insertConfigTarget(content: string, target: string): string {
    const targetsArray = findTargetsArray(content);
    const existingBody = content.slice(targetsArray.openIndex + 1, targetsArray.closeIndex);

    if (existingBody.includes(targetNameNeedle(target))) {
        throw new Error(`Target ${targetNameNeedle(target)} already exists in Mainz config.`);
    }

    const beforeClose = content.slice(0, targetsArray.closeIndex).replace(/\s*$/, "");
    const afterClose = content.slice(targetsArray.closeIndex);
    const closeLineStart = content.lastIndexOf("\n", targetsArray.closeIndex) + 1;
    const closeIndent = content.slice(closeLineStart, targetsArray.closeIndex);
    const needsComma = !beforeClose.endsWith("[") && !beforeClose.endsWith(",");
    const separator = beforeClose.endsWith("[") ? "\n" : `${needsComma ? "," : ""}\n`;

    return `${beforeClose}${separator}${target}\n${closeIndent}${afterClose}`;
}

function removeConfigTarget(content: string, targetName: string): string {
    const targetsArray = findTargetsArray(content);
    const objectRanges = findTopLevelObjectRanges(
        content,
        targetsArray.openIndex,
        targetsArray.closeIndex,
    );
    const matchingRange = objectRanges.find((range) =>
        content.slice(range.start, range.end).includes(`name: ${JSON.stringify(targetName)}`)
    );

    if (!matchingRange) {
        return content;
    }

    let removeStart = matchingRange.start;
    const lineStart = content.lastIndexOf("\n", matchingRange.start) + 1;
    if (content.slice(lineStart, matchingRange.start).trim() === "") {
        removeStart = lineStart;
    }

    let removeEnd = matchingRange.end;
    const afterObject = content.slice(removeEnd, targetsArray.closeIndex);
    const trailingCommaMatch = afterObject.match(/^\s*,/);

    if (trailingCommaMatch) {
        removeEnd += trailingCommaMatch[0].length;
        const nextNewline = content.indexOf("\n", removeEnd);
        if (nextNewline >= 0 && nextNewline < targetsArray.closeIndex) {
            removeEnd = nextNewline + 1;
        }
    } else {
        const beforeObject = content.slice(targetsArray.openIndex + 1, removeStart);
        const previousCommaIndex = beforeObject.lastIndexOf(",");
        if (previousCommaIndex >= 0 && beforeObject.slice(previousCommaIndex + 1).trim() === "") {
            removeStart = targetsArray.openIndex + 1 + previousCommaIndex;
        }
    }

    const updated = `${content.slice(0, removeStart)}${content.slice(removeEnd)}`;
    return updated.replace(/\[\s+\]/, "[]");
}

function findConfigTargetSource(content: string, targetName: string): string | undefined {
    const targetsArray = findTargetsArray(content);
    const objectRanges = findTopLevelObjectRanges(
        content,
        targetsArray.openIndex,
        targetsArray.closeIndex,
    );
    const matchingRange = objectRanges.find((range) =>
        content.slice(range.start, range.end).includes(`name: ${JSON.stringify(targetName)}`)
    );

    return matchingRange ? content.slice(matchingRange.start, matchingRange.end) : undefined;
}

function extractTargetRootDir(targetSource: string): string | undefined {
    const match = targetSource.match(/\brootDir\s*:\s*(["'])(.*?)\1/);
    return match?.[2]?.trim() || undefined;
}

async function removeAppRoot(
    rootDir: string,
    runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<void> {
    const cwd = runtime.cwd();
    const rootPath = resolve(cwd, rootDir);
    const relativeRoot = relative(cwd, rootPath);

    if (!relativeRoot || relativeRoot.startsWith("..") || isAbsolute(relativeRoot)) {
        throw new Error(`Refusing to delete app root outside the current workspace: "${rootDir}".`);
    }

    if (await pathExists(rootPath, runtime)) {
        await runtime.remove(rootPath, { recursive: true });
    }
}

function findTargetsArray(content: string): { openIndex: number; closeIndex: number } {
    const targetsIndex = content.search(/\btargets\s*:/);
    if (targetsIndex < 0) {
        throw new Error('Mainz config must contain a "targets" array to update app targets.');
    }

    const openIndex = content.indexOf("[", targetsIndex);
    if (openIndex < 0) {
        throw new Error('Mainz config "targets" must be an array.');
    }

    const closeIndex = findMatchingBracket(content, openIndex, "[", "]");
    return { openIndex, closeIndex };
}

function findTopLevelObjectRanges(
    content: string,
    openIndex: number,
    closeIndex: number,
): Array<{ start: number; end: number }> {
    const ranges: Array<{ start: number; end: number }> = [];
    for (let index = openIndex + 1; index < closeIndex; index += 1) {
        if (content[index] !== "{") {
            continue;
        }

        const end = findMatchingBracket(content, index, "{", "}") + 1;
        ranges.push({ start: index, end });
        index = end;
    }

    return ranges;
}

function findMatchingBracket(
    content: string,
    openIndex: number,
    open: string,
    close: string,
): number {
    let depth = 0;
    let quote: '"' | "'" | "`" | undefined;
    let escaped = false;

    for (let index = openIndex; index < content.length; index += 1) {
        const char = content[index];

        if (quote) {
            if (escaped) {
                escaped = false;
                continue;
            }

            if (char === "\\") {
                escaped = true;
                continue;
            }

            if (char === quote) {
                quote = undefined;
            }

            continue;
        }

        if (char === '"' || char === "'" || char === "`") {
            quote = char;
            continue;
        }

        if (char === open) {
            depth += 1;
            continue;
        }

        if (char === close) {
            depth -= 1;
            if (depth === 0) {
                return index;
            }
        }
    }

    throw new Error(`Could not find matching "${close}" in Mainz config.`);
}

function targetNameNeedle(target: string): string {
    const match = target.match(/name:\s*("[^"]+")/);
    return match?.[1] ? `name: ${match[1]}` : "target";
}

function renderConfigTarget(target: AppScaffoldTarget): string {
    return [
        "        {",
        `            name: ${JSON.stringify(target.name)},`,
        `            rootDir: ${JSON.stringify(target.rootDir)},`,
        `            appFile: ${JSON.stringify(target.appFile)},`,
        `            appId: ${JSON.stringify(target.appId)},`,
        `            outDir: ${JSON.stringify(target.outDir)},`,
        "        },",
    ].join("\n");
}

async function pathExists(
    path: string,
    runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<boolean> {
    try {
        await runtime.stat(path);
        return true;
    } catch (error) {
        if (isNotFoundError(error)) {
            return false;
        }

        throw error;
    }
}

function isNotFoundError(error: unknown): boolean {
    return error instanceof Deno.errors.NotFound ||
        (typeof error === "object" && error !== null && (
            ("name" in error && error.name === "NotFound") ||
            ("code" in error && error.code === "ENOENT")
        ));
}

function getCliBootstrapEnv(): string | undefined {
    return Deno.env.get(projectConfigBootstrapEnv);
}

function resolveBootstrapMainzImports(
    dependency: string | undefined,
): Record<"mainz" | "mainz/config" | "mainz/jsx-runtime" | "mainz/jsx-dev-runtime", string>
    | undefined {
    const localImports = resolveLocalBootstrapMainzImports();
    if (localImports) {
        return localImports;
    }

    const specifier = toBootstrapMainzSpecifier(dependency);
    if (!specifier) {
        return undefined;
    }

    return {
        mainz: specifier,
        "mainz/config": `${specifier}/config`,
        "mainz/jsx-runtime": `${specifier}/jsx-runtime`,
        "mainz/jsx-dev-runtime": `${specifier}/jsx-dev-runtime`,
    };
}

function resolveLocalBootstrapMainzImports():
    | Record<"mainz" | "mainz/config" | "mainz/jsx-runtime" | "mainz/jsx-dev-runtime", string>
    | undefined {
    if (!import.meta.url.startsWith("file:")) {
        return undefined;
    }

    const cliPath = fileURLToPath(import.meta.url);
    const repoRoot = resolve(dirname(cliPath), "..", "..");

    return {
        mainz: pathToFileURL(resolve(repoRoot, "mod.ts")).href,
        "mainz/config": pathToFileURL(resolve(repoRoot, "src", "config", "index.ts")).href,
        "mainz/jsx-runtime": pathToFileURL(resolve(repoRoot, "src", "jsx-runtime.ts")).href,
        "mainz/jsx-dev-runtime": pathToFileURL(resolve(repoRoot, "src", "jsx-dev-runtime.ts"))
            .href,
    };
}

function toBootstrapMainzSpecifier(dependency: string | undefined): string | undefined {
    if (!dependency?.trim()) {
        return undefined;
    }

    if (dependency.startsWith("jsr:@mainz/mainz@")) {
        return dependency;
    }

    const npmJsrMatch = dependency.match(/^npm:@jsr\/mainz__mainz(@.+)$/);
    if (npmJsrMatch) {
        return `jsr:@mainz/mainz${npmJsrMatch[1]}`;
    }

    return undefined;
}

function resolveToolingRuntime(runtime: SupportedCliRuntime): MainzToolingRuntime {
    if (runtime === "deno") {
        return denoToolingRuntime;
    }

    return nodeToolingRuntime;
}

async function resolveCommandToolingRuntime(
    command:
        | BuildCommandOptions
        | DevCommandOptions
        | PreviewCommandOptions
        | TestCommandOptions
        | PublishInfoCommandOptions
        | DiagnoseCommandOptions,
): Promise<MainzToolingRuntime> {
    const runtime = await resolveProjectRuntimePreference(command);
    return resolveToolingRuntime(runtime);
}

async function resolveProjectRuntimePreference(
    options: Pick<SharedCliOptions, "runtime" | "configPath">,
): Promise<SupportedCliRuntime> {
    if (options.runtime) {
        return resolveSupportedCliRuntime(options.runtime);
    }

    const projectRuntime = await readProjectRuntime(options.configPath ?? "mainz.config.ts");
    return resolveSupportedCliRuntime(projectRuntime ?? "deno");
}

async function readProjectRuntime(configPath: string): Promise<MainzRuntime | undefined> {
    const absoluteConfigPath = resolve(configPath);
    if (!(await pathExists(absoluteConfigPath))) {
        return undefined;
    }

    const source = await denoToolingRuntime.readTextFile(absoluteConfigPath);
    const match = source.match(/TEMP/);
    return match?.[1] as MainzRuntime | undefined;
}

function resolveSupportedCliRuntime(runtime: MainzRuntime): SupportedCliRuntime {
    if (runtime === "deno" || runtime === "node") {
        return runtime;
    }

    throw new Error('Runtime "bun" is not implemented yet.');
}
