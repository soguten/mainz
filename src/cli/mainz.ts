import { basename, delimiter, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";
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
import { denoToolingRuntime, nodeToolingRuntime } from "../tooling/runtime/index.ts";
import type { MainzToolingRuntime } from "../tooling/runtime/index.ts";
import { resolvePublishedMainzSpecifier } from "./package-version.ts";
import {
    instantiateTemplate,
    materializeTemplate,
    resolveBuiltInTemplateRoot,
} from "./templates/index.ts";

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
    action: "create" | "remove" | "list" | "info";
    name?: string;
    type?: "routed" | "root";
    root?: string;
    outDir?: string;
    navigation?: "spa" | "mpa" | "enhanced-mpa";
    runtime?: MainzRuntime;
    configPath?: string;
    deleteFiles?: boolean;
};

type ProfileCommandOptions = SharedCliOptions & {
    command: "profile";
    action: "create";
    name: string;
    target: string;
    basePath?: string;
    siteUrl?: string;
};

type WorkflowCommandOptions = SharedCliOptions & {
    command: "workflow";
    action: "create" | "update";
    provider: "gh-pages";
    branch?: string;
    trigger?: "push" | "manual";
};

type MainzCliCommand =
    | InitCommandOptions
    | BuildCommandOptions
    | DevCommandOptions
    | PreviewCommandOptions
    | TestCommandOptions
    | PublishInfoCommandOptions
    | DiagnoseCommandOptions
    | AppCommandOptions
    | ProfileCommandOptions
    | WorkflowCommandOptions;

type CliRuntimeName = "deno" | "node" | "bun";
type SupportedCliRuntime = "deno" | "node";

const projectConfigBootstrapEnv = "MAINZ_CLI_PROJECT_CONFIG_BOOTSTRAPPED";

class CliExitError extends Error {
    constructor(readonly code: number) {
        super(`CLI exited with code ${code}.`);
    }
}

class CliUsageError extends Error {
    constructor(message: string, readonly helpTopic: HelpTopic = "main") {
        super(message);
    }
}

type HelpTopic =
    | "main"
    | "init"
    | "app"
    | "app-create"
    | "app-remove"
    | "app-list"
    | "app-info"
    | "profile"
    | "profile-create"
    | "workflow"
    | "workflow-create"
    | "workflow-update"
    | "build"
    | "dev"
    | "preview"
    | "test"
    | "publish-info"
    | "diagnose";

if (import.meta.main && detectHostRuntime() === "deno") {
    const exitCode = await main(Deno.args, { hostRuntime: "deno" });
    if (exitCode !== 0) {
        Deno.exit(exitCode);
    }
}

/**
 * Runs the Mainz command-line interface with the provided process arguments.
 */
export async function main(
    args: string[],
    options: { hostRuntime?: SupportedCliRuntime } = {},
): Promise<number> {
    return await runCliEntryPoint(args, options.hostRuntime ?? detectHostRuntime());
}

async function runCliEntryPoint(
    args: string[],
    hostRuntime: SupportedCliRuntime,
): Promise<number> {
    try {
        return await runCli(args, hostRuntime);
    } catch (error) {
        if (error instanceof CliExitError) {
            return error.code;
        }
        if (error instanceof Error) {
            printSoftError(
                error.message,
                error instanceof CliUsageError ? error.helpTopic : "main",
            );
            return 1;
        }

        throw error;
    }
}

async function runCli(args: string[], hostRuntime: SupportedCliRuntime): Promise<number> {
    const cliSelection = parseLeadingCliSelection(args);
    if (cliSelection.cli && cliSelection.cli !== hostRuntime) {
        return await delegateToCli(cliSelection.cli, cliSelection.args, hostRuntime);
    }

    const effectiveArgs = cliSelection.args;
    const helpTopic = resolveHelpTopic(effectiveArgs);
    if (helpTopic) {
        printHelp(helpTopic);
        return 0;
    }

    const command = parseCliCommand(effectiveArgs);
    if (!command) {
        printHelp();
        return 0;
    }

    if (command.command === "init") {
        try {
            await runInitCommand(command, hostRuntime);
        } catch (error) {
            throw toCliUsageError(error, "init");
        }
        return 0;
    }

    if (command.command === "app") {
        try {
            await runAppCommand(command, hostRuntime);
        } catch (error) {
            throw toCliUsageError(error, resolveAppHelpTopic(command.action));
        }
        return 0;
    }

    if (command.command === "profile") {
        try {
            await runProfileCommand(command, hostRuntime);
        } catch (error) {
            throw toCliUsageError(error, "profile-create");
        }
        return 0;
    }

    if (command.command === "workflow") {
        try {
            await runWorkflowCommand(command, hostRuntime);
        } catch (error) {
            throw toCliUsageError(
                error,
                command.action === "create" ? "workflow-create" : "workflow-update",
            );
        }
        return 0;
    }

    if (await rerunWithProjectBootstrapIfNeeded(command, effectiveArgs, hostRuntime)) {
        return 0;
    }

    const runtime = await resolveCommandToolingRuntime(command, hostRuntime);
    const loadedConfig = await loadMainzConfig(command.configPath, runtime);
    const normalizedConfig = normalizeMainzConfig(loadedConfig.config);

    switch (command.command) {
        case "publish-info":
            try {
                await runPublishInfoCommand(command, normalizedConfig, runtime);
            } catch (error) {
                throw toCliUsageError(error, "publish-info");
            }
            return 0;
        case "diagnose":
            try {
                return await runDiagnoseCommand(command, normalizedConfig, runtime);
            } catch (error) {
                throw toCliUsageError(error, "diagnose");
            }
        case "dev":
            try {
                await runDevCommand(command, loadedConfig, normalizedConfig, runtime);
            } catch (error) {
                throw toCliUsageError(error, "dev");
            }
            return 0;
        case "preview":
            try {
                await runPreviewCommand(command, loadedConfig, normalizedConfig, runtime);
            } catch (error) {
                throw toCliUsageError(error, "preview");
            }
            return 0;
        case "test":
            try {
                return await runTestCommand(command, normalizedConfig, runtime);
            } catch (error) {
                throw toCliUsageError(error, "test");
            }
        case "build":
            try {
                await runBuildCommand(command, loadedConfig, normalizedConfig, runtime);
            } catch (error) {
                throw toCliUsageError(error, "build");
            }
            return 0;
    }
}

async function delegateToCli(
    cli: CliRuntimeName,
    args: readonly string[],
    hostRuntime: SupportedCliRuntime,
): Promise<number> {
    const runtime = hostRuntime === "deno" ? denoToolingRuntime : nodeToolingRuntime;
    const candidates = resolveCliDelegationCandidates(cli, args);

    for (let index = 0; index < candidates.length; index += 1) {
        const candidate = candidates[index];
        if (
            candidate.requiresPathLookup &&
            !(await canResolveExecutable(candidate.command, runtime))
        ) {
            continue;
        }

        try {
            const invocation = resolveCliInvocation(candidate.command, candidate.args);
            const status = await runtime.run({
                command: invocation.command,
                cwd: runtime.cwd(),
                args: invocation.args,
                stdin: "inherit",
                stdout: "inherit",
                stderr: "inherit",
            });
            return status.code;
        } catch (error) {
            if (isCommandNotFoundError(error) && index < candidates.length - 1) {
                continue;
            }

            if (isCommandNotFoundError(error)) {
                throw new CliUsageError(
                    `Could not execute a ${cli}-hosted Mainz CLI. Install the required ${cli} runtime or install the ${cli}-hosted Mainz CLI globally.`,
                    "main",
                );
            }

            throw error;
        }
    }

    throw new CliUsageError(`Could not resolve a ${cli}-hosted Mainz CLI delegation target.`);
}

function resolveCliDelegationCandidates(
    cli: CliRuntimeName,
    args: readonly string[],
): Array<{ command: string; args: readonly string[]; requiresPathLookup?: boolean }> {
    const explicit = {
        command: `mainz-cli-${cli}`,
        args,
        requiresPathLookup: true,
    };

    if (cli === "deno") {
        return [
            explicit,
            {
                command: "deno",
                args: ["run", "-A", "jsr:@mainz/cli-deno@alpha", ...args],
            },
        ];
    }

    if (cli === "node") {
        return [
            explicit,
            {
                command: "npx",
                args: ["-y", "@mainzjs/cli-node@alpha", ...args],
            },
        ];
    }

    return [
        explicit,
        {
            command: "bunx",
            args: ["@mainzjs/cli-bun@alpha", ...args],
        },
    ];
}

async function canResolveExecutable(
    command: string,
    runtime: MainzToolingRuntime,
): Promise<boolean> {
    const pathValue = process.env.PATH ?? "";
    const extensions = process.platform === "win32"
        ? (process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD")
            .split(";")
            .filter(Boolean)
        : [""];
    const commandHasExtension = /\.[^\\/]+$/.test(command);

    for (const directory of pathValue.split(delimiter).filter(Boolean)) {
        const names = process.platform === "win32" && !commandHasExtension
            ? extensions.map((extension) => `${command}${extension.toLowerCase()}`)
            : [command];

        for (const name of names) {
            if (await pathExists(join(directory, name), runtime)) {
                return true;
            }
        }
    }

    return false;
}

function resolveCliInvocation(
    executable: string,
    args: readonly string[],
): { command: string; args: readonly string[] } {
    if (process.platform !== "win32") {
        return { command: executable, args };
    }

    return {
        command: process.env.ComSpec ?? "cmd.exe",
        args: ["/d", "/s", "/c", executable, ...args],
    };
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
    hostRuntime: SupportedCliRuntime,
): Promise<boolean> {
    if (hostRuntime !== "deno") {
        return false;
    }

    const runtime = denoToolingRuntime;
    if (getCliBootstrapEnv() === "1") {
        return false;
    }

    const projectRuntime = await resolveProjectRuntimePreference(command, hostRuntime);
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
    const remainingArgs = parseLeadingCliOptions(args);
    const [command, ...rest] = remainingArgs;

    if (!command || command === "help" || command === "--help" || command === "-h") {
        return undefined;
    }

    if (
        command !== "build" && command !== "dev" && command !== "preview" && command !== "test" &&
        command !== "publish-info" &&
        command !== "diagnose" &&
        command !== "app" &&
        command !== "init" &&
        command !== "profile" &&
        command !== "workflow"
    ) {
        throw new CliUsageError(
            `Unknown command "${command}". Use "init", "app", "profile", "workflow", "build", "dev", "preview", "test", "publish-info", or "diagnose".`,
            "main",
        );
    }

    if (command === "init") {
        return parseInitCommand(rest);
    }

    if (command === "app") {
        return parseAppCommand(rest);
    }

    if (command === "profile") {
        return parseProfileCommand(rest);
    }

    if (command === "workflow") {
        return parseWorkflowCommand(rest);
    }

    const options = parseCommandOptions(command, rest);

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

function parseLeadingCliSelection(args: readonly string[]): {
    cli?: CliRuntimeName;
    args: string[];
} {
    const remainingArgs = [...args];
    let cli: CliRuntimeName | undefined;

    while (remainingArgs[0] === "--cli") {
        const value = remainingArgs[1];
        if (value !== "deno" && value !== "node" && value !== "bun") {
            throw new CliUsageError(
                `Unsupported CLI "${value ?? ""}". Use "deno", "node", or "bun".`,
                "main",
            );
        }

        cli = value;
        remainingArgs.splice(0, 2);
    }

    return { cli, args: remainingArgs };
}

function parseLeadingCliOptions(args: readonly string[]): string[] {
    const { cli, args: remainingArgs } = parseLeadingCliSelection(args);
    if (cli) {
        if (cli !== "deno") {
            throw new CliUsageError(
                `This executable is the Deno-hosted Mainz CLI. Received "--cli ${cli}".`,
                "main",
            );
        }
    }

    return remainingArgs;
}

function parseInitCommand(args: string[]): InitCommandOptions {
    const options: Omit<InitCommandOptions, "command"> = {};

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

function parseAppCommand(args: string[]): AppCommandOptions {
    const [action, maybeName, ...rest] = args;

    if (action !== "create" && action !== "remove" && action !== "list" && action !== "info") {
        throw new Error('Command "app" requires "create", "remove", "list", or "info".');
    }

    const positionalName = maybeName?.startsWith("--") ? undefined : maybeName;
    const remaining = positionalName ? rest : [maybeName, ...rest].filter(Boolean);

    const options: Pick<
        AppCommandOptions,
        "type" | "root" | "outDir" | "navigation" | "configPath" | "deleteFiles" | "runtime"
    > = {};
    let flagName: string | undefined;

    for (let index = 0; index < remaining.length; index += 1) {
        const current = remaining[index];

        if (current === "--name" && action === "create") {
            flagName = readOptionValue(current, remaining[index + 1]);
            index += 1;
            continue;
        }

        if (current === "--target" && (action === "remove" || action === "info")) {
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

    const name = action === "list"
        ? undefined
        : resolveAppCommandName(action, positionalName, flagName);

    return {
        command: "app",
        action,
        name,
        ...options,
    };
}

function parseProfileCommand(args: string[]): ProfileCommandOptions {
    const [action, maybeName, ...rest] = args;
    if (action !== "create") {
        throw new Error('Command "profile" requires "create".');
    }

    const positionalName = maybeName?.startsWith("--") ? undefined : maybeName;
    const remaining = positionalName ? rest : [maybeName, ...rest].filter(Boolean);
    const options: Pick<ProfileCommandOptions, "basePath" | "siteUrl" | "configPath" | "runtime"> =
        {};
    let flagName: string | undefined;
    let target: string | undefined;

    for (let index = 0; index < remaining.length; index += 1) {
        const current = remaining[index];

        if (current === "--name") {
            flagName = readOptionValue(current, remaining[index + 1]);
            index += 1;
            continue;
        }

        if (current === "--target") {
            target = readOptionValue(current, remaining[index + 1]);
            index += 1;
            continue;
        }

        if (current === "--base-path") {
            options.basePath = readOptionValue(current, remaining[index + 1]);
            index += 1;
            continue;
        }

        if (current === "--site-url") {
            options.siteUrl = readOptionValue(current, remaining[index + 1]);
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

        throw new Error(`Unknown option "${current}".`);
    }

    if (!target?.trim()) {
        throw new Error('Command "profile create" requires --target <name>.');
    }

    return {
        command: "profile",
        action,
        name: resolveNamedCommandValue("profile create", positionalName, flagName),
        target,
        ...options,
    };
}

function parseWorkflowCommand(args: string[]): WorkflowCommandOptions {
    const [action, maybeProvider, ...rest] = args;
    if (action !== "create" && action !== "update") {
        throw new Error('Command "workflow" requires "create" or "update".');
    }

    const providerInput = maybeProvider?.trim();
    if (providerInput !== "gh-pages" && providerInput !== "github-pages") {
        throw new Error(
            `Unsupported workflow provider "${providerInput ?? ""}". Use "gh-pages".`,
        );
    }
    const provider = "gh-pages";

    const options: Omit<WorkflowCommandOptions, "command" | "action" | "provider"> = {};

    for (let index = 0; index < rest.length; index += 1) {
        const current = rest[index];

        if (current === "--branch") {
            options.branch = readOptionValue(current, rest[index + 1]);
            index += 1;
            continue;
        }

        if (current === "--trigger") {
            const trigger = readOptionValue(current, rest[index + 1]);
            if (trigger !== "push" && trigger !== "manual") {
                throw new Error(
                    `Unsupported workflow trigger "${trigger}". Use "push" or "manual".`,
                );
            }

            options.trigger = trigger;
            index += 1;
            continue;
        }

        if (current === "--config") {
            options.configPath = readOptionValue(current, rest[index + 1]);
            index += 1;
            continue;
        }

        if (current === "--runtime") {
            options.runtime = parseRuntimeOption(rest[index + 1]);
            index += 1;
            continue;
        }

        throw new Error(`Unknown option "${current}".`);
    }

    return {
        command: "workflow",
        action,
        provider,
        ...options,
    };
}

function resolveAppCommandName(
    action: AppCommandOptions["action"],
    positionalName: string | undefined,
    flagName: string | undefined,
): string {
    return resolveNamedCommandValue(`app ${action}`, positionalName, flagName);
}

function resolveNamedCommandValue(
    commandLabel: string,
    positionalName: string | undefined,
    flagName: string | undefined,
): string {
    if (positionalName?.trim() && flagName?.trim() && positionalName.trim() !== flagName.trim()) {
        throw new Error(
            `Command "${commandLabel}" received conflicting names "${positionalName}" and "${flagName}".`,
        );
    }

    const resolved = flagName?.trim() || positionalName?.trim();
    if (!resolved) {
        throw new Error(`Command "${commandLabel}" requires a name.`);
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

function parseAppType(value: string | undefined): "routed" | "root" {
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
):
    & SharedCliOptions
    & Pick<DiagnoseCommandOptions, "app" | "format" | "failOn">
    & Pick<DevCommandOptions, "host" | "port"> {
    const options:
        & SharedCliOptions
        & Pick<DiagnoseCommandOptions, "app" | "format" | "failOn">
        & Pick<DevCommandOptions, "host" | "port"> = {};

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

async function runInitCommand(
    options: InitCommandOptions,
    hostRuntime: SupportedCliRuntime,
): Promise<void> {
    const projectRuntime = resolveSupportedCliRuntime(options.runtime ?? hostRuntime);
    const runtime = denoToolingRuntime;
    const projectName = basename(runtime.cwd()) || "mainz-app";
    const configPath = options.configPath ?? "mainz.config.ts";
    const denoConfigPath = options.denoConfigPath ?? "deno.json";
    const mainzSpecifier = options.mainzSpecifier ??
        await resolvePublishedMainzSpecifier(import.meta.url, runtime);
    const generatedMainzSpecifier = projectRuntime === "node"
        ? renderGeneratedNodeMainzSpecifier(mainzSpecifier)
        : mainzSpecifier;
    const plan = await materializeTemplate({
        runtime,
        templateRoot: resolveBuiltInTemplateRoot(
            "project",
            projectRuntime === "node" ? "empty-node" : "empty-deno",
        ),
        outputDir: runtime.cwd(),
        params: {
            mainzSpecifier: generatedMainzSpecifier,
            projectName,
            denoConfigPath,
            mainzCliSpecifier: renderGeneratedMainzCliSpecifier(mainzSpecifier),
            mainzSubpathPrefix: renderGeneratedMainzSubpathPrefix(mainzSpecifier),
        },
        beforeWrite: async (path) => await assertCanCreateTemplateFile(path, runtime),
    });

    console.log(`[mainz] Initialized Mainz project in ${runtime.cwd()}.`);
    console.log(`[mainz] Created ${plan.files.map((file) => file.path).join(", ")}.`);
    console.log('[mainz] Add an app with "mainz app create <name>".');
}

async function runAppCommand(
    options: AppCommandOptions,
    hostRuntime: SupportedCliRuntime,
): Promise<void> {
    if (options.action === "create") {
        await runAppCreateCommand(options, hostRuntime);
        return;
    }

    if (options.action === "remove") {
        await runAppRemoveCommand(options);
        return;
    }

    if (options.action === "list") {
        await runAppListCommand(options, hostRuntime);
        return;
    }

    await runAppInfoCommand(options, hostRuntime);
}

async function runAppCreateCommand(
    options: AppCommandOptions,
    hostRuntime: SupportedCliRuntime,
): Promise<void> {
    const projectRuntime = await resolveProjectRuntimePreference(options, hostRuntime);
    const runtime = resolveToolingRuntime(projectRuntime);
    const appName = normalizeAppName(options.name!);
    const rootDir = normalizeAppRoot(options.root ?? `./${appName}`);
    const rootPath = resolve(rootDir);
    const outDir = normalizeOutDir(options.outDir ?? `dist/${appName}`);
    const configPath = options.configPath ?? "mainz.config.ts";
    const plan = await materializeTemplate({
        runtime,
        templateRoot: resolveBuiltInTemplateRoot("app", options.type ?? "routed"),
        outputDir: rootPath,
        params: {
            appName,
            appId: appName,
            appNavigation: options.navigation ?? "enhanced-mpa",
            appTitle: appName,
            customElementPrefix: `x-mainz-${toKebabCase(appName)}`,
            rootDir,
            outDir,
        },
        beforeWrite: async (path) => await assertCanCreateTemplateFile(path, runtime),
    });
    const target = resolveTemplateTarget(plan.manifest);

    await upsertConfigTarget(
        configPath,
        renderConfigTarget(target),
        projectRuntime,
        runtime,
    );

    console.log(`[mainz] Created app "${appName}" in ${rootDir}.`);
}

async function runAppRemoveCommand(options: AppCommandOptions): Promise<void> {
    const runtime = denoToolingRuntime;
    const appName = normalizeAppName(options.name!);
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

async function runAppListCommand(
    options: AppCommandOptions,
    hostRuntime: SupportedCliRuntime,
): Promise<void> {
    const projectRuntime = await resolveProjectRuntimePreference(options, hostRuntime);
    const runtime = resolveToolingRuntime(projectRuntime);
    const loadedConfig = await loadMainzConfig(options.configPath, runtime);
    const normalizedConfig = normalizeMainzConfig(loadedConfig.config);

    console.log(JSON.stringify(
        normalizedConfig.targets.map((target) => ({
            target: target.name,
            appId: target.appId ?? null,
            rootDir: target.rootDir,
            appFile: target.appFile ?? null,
            outDir: target.outDir,
        })),
        null,
        2,
    ));
}

async function runAppInfoCommand(
    options: AppCommandOptions,
    hostRuntime: SupportedCliRuntime,
): Promise<void> {
    const projectRuntime = await resolveProjectRuntimePreference(options, hostRuntime);
    const runtime = resolveToolingRuntime(projectRuntime);
    const loadedConfig = await loadMainzConfig(options.configPath, runtime);
    const normalizedConfig = normalizeMainzConfig(loadedConfig.config);
    const target = resolveRequiredTarget(normalizedConfig, options.name, "app-info");

    console.log(JSON.stringify(
        {
            target: target.name,
            appId: target.appId ?? null,
            rootDir: target.rootDir,
            appFile: target.appFile ?? null,
            outDir: target.outDir,
            vite: target.viteConfig
                ? {
                    source: "explicit",
                    configPath: target.viteConfig,
                }
                : {
                    source: "generated",
                    configPath: null,
                },
            build: {
                configPath: resolveTargetBuildConfigFile(target, runtime.cwd()) ?? null,
            },
        },
        null,
        2,
    ));
}

async function runProfileCommand(
    options: ProfileCommandOptions,
    hostRuntime: SupportedCliRuntime,
): Promise<void> {
    const projectRuntime = await resolveProjectRuntimePreference(options, hostRuntime);
    if (projectRuntime !== "deno") {
        throw new Error(
            `Command "profile create" is not implemented yet for runtime "${projectRuntime}".`,
        );
    }

    const runtime = resolveToolingRuntime(projectRuntime);
    const loadedConfig = await loadMainzConfig(options.configPath, runtime);
    const normalizedConfig = normalizeMainzConfig(loadedConfig.config);
    const target = resolveRequiredTarget(normalizedConfig, options.target, "profile-create");
    const profileName = options.name.trim();
    const buildConfigPath = resolveTargetBuildConfigFile(target, runtime.cwd());
    const profileSource = renderBuildProfileProperty(profileName, {
        basePath: options.basePath ?? inferDefaultProfileBasePath(target.name),
        siteUrl: options.siteUrl,
    });

    if (await pathExists(buildConfigPath, runtime)) {
        const content = await runtime.readTextFile(buildConfigPath);
        await runtime.writeTextFile(
            buildConfigPath,
            upsertBuildProfile(content, profileName, profileSource),
        );
    } else {
        await runtime.mkdir(dirname(buildConfigPath), { recursive: true });
        await runtime.writeTextFile(buildConfigPath, renderGeneratedBuildConfig(profileSource));
    }

    console.log(
        `[mainz] Updated profile "${profileName}" for target "${target.name}" in ${
            normalizePathSlashes(relative(runtime.cwd(), buildConfigPath) || buildConfigPath)
        }.`,
    );
}

async function runWorkflowCommand(
    options: WorkflowCommandOptions,
    hostRuntime: SupportedCliRuntime,
): Promise<void> {
    const projectRuntime = await resolveProjectRuntimePreference(options, hostRuntime);
    if (projectRuntime !== "deno") {
        throw new Error(
            `Command "workflow ${options.action}" is not implemented yet for runtime "${projectRuntime}".`,
        );
    }

    const runtime = resolveToolingRuntime(projectRuntime);
    const loadedConfig = await loadMainzConfig(options.configPath, runtime);
    const normalizedConfig = normalizeMainzConfig(loadedConfig.config);
    const workflowTemplateRoot = resolveBuiltInTemplateRoot("workflow", options.provider);
    const workflowPath = resolve(runtime.cwd(), ".github", "workflows", "deploy-github-pages.yml");
    const workflowExists = await pathExists(workflowPath, runtime);

    if (options.action === "create" && workflowExists) {
        throw new Error(`Workflow file "${workflowPath}" already exists.`);
    }

    if (options.action === "update" && !workflowExists) {
        throw new Error(`Workflow file "${workflowPath}" does not exist yet.`);
    }

    const publishTargets = await resolveGithubPagesWorkflowTargets(normalizedConfig, runtime);
    if (publishTargets.length === 0) {
        throw new Error('No targets define a "gh-pages" profile.');
    }

    const plan = await instantiateTemplate({
        runtime,
        templateRoot: workflowTemplateRoot,
        outputDir: runtime.cwd(),
        params: renderGithubPagesWorkflowTemplateParams({
            branch: options.branch?.trim() || "main",
            trigger: options.trigger ?? "push",
            targets: publishTargets,
        }),
    });

    await runtime.mkdir(dirname(workflowPath), { recursive: true });
    for (const file of plan.files) {
        await runtime.mkdir(dirname(file.path), { recursive: true });
        await runtime.writeTextFile(file.path, file.content);
    }

    console.log(`[mainz] Wrote GitHub Pages workflow to ${workflowPath}.`);
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

    await runEngineDevServer(
        normalizedConfig,
        target,
        profile,
        {
            host: options.host,
            port: options.port,
        },
        cwd,
        runtime,
    );
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
    command: "dev" | "preview" | "publish-info" | "app-info" | "profile-create",
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

function printHelp(topic: HelpTopic = "main"): void {
    console.log(
        getHelpText(topic).join("\n"),
    );
}

function getHelpText(topic: HelpTopic): string[] {
    if (topic === "init") {
        return [
            "Mainz CLI - init",
            "",
            "Usage:",
            "  mainz init [--runtime <deno|node|bun>] [--config <path>] [--deno-config <path>] [--mainz <specifier>]",
            "",
            "Notes:",
            "  --runtime selects the runtime of the generated project, not the CLI host.",
            "  This executable already is the Deno-hosted CLI.",
        ];
    }

    if (topic === "app") {
        return [
            "Mainz CLI - app",
            "",
            "Usage:",
            "  mainz app create [<name>|--name <name>] [--type <routed|root>] [--root <path>] [--out-dir <path>] [--navigation <spa|mpa|enhanced-mpa>] [--config <path>]",
            "  mainz app remove [<target>|--target <target>] [--delete-files] [--config <path>]",
            "  mainz app list [--config <path>]",
            "  mainz app info [<target>|--target <target>] [--config <path>]",
        ];
    }

    if (topic === "app-create") {
        return [
            "Mainz CLI - app create",
            "",
            "Usage:",
            "  mainz app create [<name>|--name <name>] [--type <routed|root>] [--root <path>] [--out-dir <path>] [--navigation <spa|mpa|enhanced-mpa>] [--config <path>]",
        ];
    }

    if (topic === "app-remove") {
        return [
            "Mainz CLI - app remove",
            "",
            "Usage:",
            "  mainz app remove [<target>|--target <target>] [--delete-files] [--config <path>]",
        ];
    }

    if (topic === "app-list") {
        return [
            "Mainz CLI - app list",
            "",
            "Usage:",
            "  mainz app list [--config <path>]",
        ];
    }

    if (topic === "app-info") {
        return [
            "Mainz CLI - app info",
            "",
            "Usage:",
            "  mainz app info [<target>|--target <target>] [--config <path>]",
        ];
    }

    if (topic === "profile") {
        return [
            "Mainz CLI - profile",
            "",
            "Usage:",
            "  mainz profile create [<name>|--name <name>] --target <name> [--base-path <path>] [--site-url <url>] [--config <path>]",
        ];
    }

    if (topic === "profile-create") {
        return [
            "Mainz CLI - profile create",
            "",
            "Usage:",
            "  mainz profile create [<name>|--name <name>] --target <name> [--base-path <path>] [--site-url <url>] [--config <path>]",
        ];
    }

    if (topic === "workflow") {
        return [
            "Mainz CLI - workflow",
            "",
            "Usage:",
            "  mainz workflow create gh-pages [--branch <name>] [--trigger <push|manual>] [--config <path>]",
            "  mainz workflow update gh-pages [--branch <name>] [--trigger <push|manual>] [--config <path>]",
        ];
    }

    if (topic === "workflow-create") {
        return [
            "Mainz CLI - workflow create",
            "",
            "Usage:",
            "  mainz workflow create gh-pages [--branch <name>] [--trigger <push|manual>] [--config <path>]",
        ];
    }

    if (topic === "workflow-update") {
        return [
            "Mainz CLI - workflow update",
            "",
            "Usage:",
            "  mainz workflow update gh-pages [--branch <name>] [--trigger <push|manual>] [--config <path>]",
        ];
    }

    if (topic === "dev") {
        return [
            "Mainz CLI - dev",
            "",
            "Usage:",
            "  mainz dev --target <name> [--profile <name>] [--host [host]] [--port <port>] [--config <path>]",
        ];
    }

    if (topic === "build") {
        return [
            "Mainz CLI - build",
            "",
            "Usage:",
            "  mainz build [--target <name|all>] [--profile <name>] [--config <path>]",
        ];
    }

    if (topic === "preview") {
        return [
            "Mainz CLI - preview",
            "",
            "Usage:",
            "  mainz preview --target <name> [--profile <name>] [--host [host]] [--port <port>] [--config <path>]",
        ];
    }

    if (topic === "test") {
        return [
            "Mainz CLI - test",
            "",
            "Usage:",
            "  mainz test [--target <name|all>] [--config <path>]",
        ];
    }

    if (topic === "publish-info") {
        return [
            "Mainz CLI - publish-info",
            "",
            "Usage:",
            "  mainz publish-info --target <name> [--profile <name>] [--config <path>]",
        ];
    }

    if (topic === "diagnose") {
        return [
            "Mainz CLI - diagnose",
            "",
            "Usage:",
            "  mainz diagnose [--target <name|all>] [--app <id>] [--format <json|human>] [--fail-on <never|error|warning>] [--config <path>]",
        ];
    }

    return [
        "Mainz CLI",
        "",
        "Usage:",
        "  mainz [--cli <deno|node|bun>] init [--runtime <deno|node|bun>] [--config <path>] [--deno-config <path>] [--mainz <specifier>]",
        "  mainz [--cli <deno|node|bun>] app create [<name>|--name <name>] [--type <routed|root>] [--root <path>] [--out-dir <path>] [--navigation <spa|mpa|enhanced-mpa>] [--config <path>] [--runtime <deno|node|bun>]",
        "  mainz [--cli <deno|node|bun>] app remove [<target>|--target <target>] [--delete-files] [--config <path>] [--runtime <deno|node|bun>]",
        "  mainz [--cli <deno|node|bun>] app list [--config <path>] [--runtime <deno|node|bun>]",
        "  mainz [--cli <deno|node|bun>] app info [<target>|--target <target>] [--config <path>] [--runtime <deno|node|bun>]",
        "  mainz [--cli <deno|node|bun>] profile create [<name>|--name <name>] --target <name> [--base-path <path>] [--site-url <url>] [--config <path>] [--runtime <deno|node|bun>]",
        "  mainz [--cli <deno|node|bun>] workflow create gh-pages [--branch <name>] [--trigger <push|manual>] [--config <path>] [--runtime <deno|node|bun>]",
        "  mainz [--cli <deno|node|bun>] workflow update gh-pages [--branch <name>] [--trigger <push|manual>] [--config <path>] [--runtime <deno|node|bun>]",
        "  mainz [--cli <deno|node|bun>] build [--target <name|all>] [--profile <name>] [--config <path>] [--runtime <deno|node|bun>]",
        "  mainz [--cli <deno|node|bun>] dev --target <name> [--profile <name>] [--host [host]] [--port <port>] [--config <path>] [--runtime <deno|node|bun>]",
        "  mainz [--cli <deno|node|bun>] preview --target <name> [--profile <name>] [--host [host]] [--port <port>] [--config <path>] [--runtime <deno|node|bun>]",
        "  mainz [--cli <deno|node|bun>] test [--target <name|all>] [--config <path>] [--runtime <deno|node|bun>]",
        "  mainz [--cli <deno|node|bun>] publish-info --target <name> [--profile <name>] [--config <path>] [--runtime <deno|node|bun>]",
        "  mainz [--cli <deno|node|bun>] diagnose [--target <name|all>] [--app <id>] [--format <json|human>] [--fail-on <never|error|warning>] [--config <path>] [--runtime <deno|node|bun>]",
        "",
        "Global options:",
        "  --cli <deno|node|bun>      Selects which installed Mainz CLI host should execute the command.",
        "",
        "Command options:",
        "  --runtime <deno|node|bun>  Selects the generated or targeted project runtime.",
        "",
        "The --runtime option belongs after the command that consumes it. Use --cli before the",
        "command only when selecting which installed CLI host should execute the operation.",
        "When --runtime is omitted, Mainz prefers the explicit project runtime and otherwise",
        "falls back to the host runtime of the installed CLI package.",
        "",
        "Examples:",
        "  mainz init",
        "  mainz init --mainz jsr:@mainz/mainz@<version>",
        "  mainz app create site",
        "  mainz app create --name site",
        "  mainz app create docs --navigation enhanced-mpa",
        "  mainz app create portal --type root",
        "  mainz app remove site",
        "  mainz app remove --target site",
        "  mainz app list",
        "  mainz app info site",
        "  mainz profile create gh-pages --target site --base-path /",
        "  mainz workflow create gh-pages",
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
    ];
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

function resolveHelpTopic(args: readonly string[]): HelpTopic | undefined {
    const hasHelp = args.includes("--help") || args.includes("-h") || args.includes("help");
    if (!hasHelp) {
        return undefined;
    }

    const filtered = args.filter((arg) => arg !== "--help" && arg !== "-h" && arg !== "help");
    const withoutGlobals = skipLeadingGlobalOptions(filtered);
    const [command, subcommand] = withoutGlobals;

    if (command === "init") {
        return "init";
    }
    if (command === "app" && subcommand === "create") {
        return "app-create";
    }
    if (command === "app" && subcommand === "remove") {
        return "app-remove";
    }
    if (command === "app" && subcommand === "list") {
        return "app-list";
    }
    if (command === "app" && subcommand === "info") {
        return "app-info";
    }
    if (command === "profile" && subcommand === "create") {
        return "profile-create";
    }
    if (command === "profile") {
        return "profile";
    }
    if (command === "workflow" && subcommand === "create") {
        return "workflow-create";
    }
    if (command === "workflow" && subcommand === "update") {
        return "workflow-update";
    }
    if (command === "workflow") {
        return "workflow";
    }
    if (command === "app") {
        return "app";
    }
    if (command === "build") {
        return "build";
    }
    if (command === "dev") {
        return "dev";
    }
    if (command === "preview") {
        return "preview";
    }
    if (command === "test") {
        return "test";
    }
    if (command === "publish-info") {
        return "publish-info";
    }
    if (command === "diagnose") {
        return "diagnose";
    }

    return "main";
}

function skipLeadingGlobalOptions(args: readonly string[]): string[] {
    const remaining = [...args];
    while (remaining[0] === "--cli") {
        remaining.splice(0, 2);
    }
    return remaining;
}

function toCliUsageError(error: unknown, helpTopic: HelpTopic): Error {
    if (error instanceof CliUsageError || error instanceof CliExitError) {
        return error;
    }
    if (error instanceof Error) {
        return new CliUsageError(error.message, helpTopic);
    }
    return new CliUsageError(String(error), helpTopic);
}

function printSoftError(message: string, helpTopic: HelpTopic = "main"): void {
    console.error(`[mainz] ${message}`);
    console.error(`[mainz] Run "mainz ${renderHelpCommand(helpTopic)}" for usage.`);
}

function renderHelpCommand(helpTopic: HelpTopic): string {
    if (helpTopic === "main") {
        return "--help";
    }
    if (helpTopic === "app-create") {
        return "app create --help";
    }
    if (helpTopic === "app-remove") {
        return "app remove --help";
    }
    if (helpTopic === "app-list") {
        return "app list --help";
    }
    if (helpTopic === "app-info") {
        return "app info --help";
    }
    if (helpTopic === "profile-create") {
        return "profile create --help";
    }
    if (helpTopic === "workflow-create") {
        return "workflow create --help";
    }
    if (helpTopic === "workflow-update") {
        return "workflow update --help";
    }
    return `${helpTopic} --help`;
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

async function assertCanCreateTemplateFile(
    path: string,
    runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<void> {
    const absolutePath = resolve(path);
    if (await pathExists(absolutePath, runtime)) {
        throw new Error(`Refusing to overwrite existing file "${absolutePath}".`);
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

function renderConfigTarget(target: {
    name: string;
    rootDir: string;
    appFile: string;
    appId: string;
    outDir: string;
}): string {
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

function resolveAppHelpTopic(action: AppCommandOptions["action"]): HelpTopic {
    if (action === "create") {
        return "app-create";
    }

    if (action === "remove") {
        return "app-remove";
    }

    if (action === "list") {
        return "app-list";
    }

    return "app-info";
}

function renderGeneratedBuildConfig(profileSource: string): string {
    return [
        'import { defineTargetBuild } from "mainz/config";',
        "",
        "export default defineTargetBuild({",
        "    profiles: {",
        profileSource,
        "    },",
        "});",
        "",
    ].join("\n");
}

function renderBuildProfileProperty(
    profileName: string,
    options: { basePath?: string; siteUrl?: string },
): string {
    const properties: string[] = [];
    if (options.basePath) {
        properties.push(`            basePath: ${JSON.stringify(options.basePath)},`);
    }
    if (options.siteUrl) {
        properties.push(`            siteUrl: ${JSON.stringify(options.siteUrl)},`);
    }

    return [
        `        ${JSON.stringify(profileName)}: {`,
        ...properties,
        "        },",
    ].join("\n");
}

function upsertBuildProfile(content: string, profileName: string, profileSource: string): string {
    const profilesObject = findNamedObject(content, "profiles");
    const existingRange = findNamedPropertyRange(
        content,
        profilesObject.openIndex,
        profilesObject.closeIndex,
        profileName,
    );

    if (existingRange) {
        return `${content.slice(0, existingRange.start)}${profileSource}${
            content.slice(existingRange.end)
        }`;
    }

    const beforeClose = content.slice(0, profilesObject.closeIndex).replace(/\s*$/, "");
    const afterClose = content.slice(profilesObject.closeIndex);
    const closeLineStart = content.lastIndexOf("\n", profilesObject.closeIndex) + 1;
    const closeIndent = content.slice(closeLineStart, profilesObject.closeIndex);
    const needsComma = !beforeClose.endsWith("{") && !beforeClose.endsWith(",");
    const separator = beforeClose.endsWith("{") ? "\n" : `${needsComma ? "," : ""}\n`;

    return `${beforeClose}${separator}${profileSource}\n${closeIndent}${afterClose}`;
}

function findNamedObject(
    content: string,
    propertyName: string,
): { openIndex: number; closeIndex: number } {
    const propertyIndex = content.search(new RegExp(`\\b${propertyName}\\s*:`));
    if (propertyIndex < 0) {
        throw new Error(`Expected "${propertyName}" to be an object.`);
    }

    const openIndex = content.indexOf("{", propertyIndex);
    if (openIndex < 0) {
        throw new Error(`Expected "${propertyName}" to be an object.`);
    }

    return {
        openIndex,
        closeIndex: findMatchingBracket(content, openIndex, "{", "}"),
    };
}

function findNamedPropertyRange(
    content: string,
    openIndex: number,
    closeIndex: number,
    propertyName: string,
): { start: number; end: number } | undefined {
    let quote: '"' | "'" | "`" | undefined;
    let escaped = false;
    let depth = 0;

    for (let index = openIndex + 1; index < closeIndex; index += 1) {
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

        if (char === "{") {
            depth += 1;
            continue;
        }

        if (char === "}") {
            depth -= 1;
            continue;
        }

        if (depth !== 0) {
            continue;
        }

        const propertyNeedles = [`"${propertyName}"`, `'${propertyName}'`];
        const matchingNeedle = propertyNeedles.find((needle) => content.startsWith(needle, index));
        if (!matchingNeedle) {
            continue;
        }

        const afterNeedle = content.slice(index + matchingNeedle.length);
        if (!afterNeedle.match(/^\s*:/)) {
            continue;
        }

        const valueStart = content.indexOf("{", index + matchingNeedle.length);
        if (valueStart < 0 || valueStart > closeIndex) {
            throw new Error(`Profile "${propertyName}" must use an object value.`);
        }

        const valueEnd = findMatchingBracket(content, valueStart, "{", "}") + 1;
        let propertyStart = index;
        const lineStart = content.lastIndexOf("\n", index) + 1;
        if (content.slice(lineStart, index).trim() === "") {
            propertyStart = lineStart;
        }

        let propertyEnd = valueEnd;
        const afterValue = content.slice(propertyEnd, closeIndex);
        const trailingCommaMatch = afterValue.match(/^\s*,/);
        if (trailingCommaMatch) {
            propertyEnd += trailingCommaMatch[0].length;
            const newlineIndex = content.indexOf("\n", propertyEnd);
            if (newlineIndex >= 0 && newlineIndex < closeIndex) {
                propertyEnd = newlineIndex + 1;
            }
        }

        return {
            start: propertyStart,
            end: propertyEnd,
        };
    }

    return undefined;
}

function resolveTargetBuildConfigFile(
    target: NormalizedMainzTarget,
    cwd: string,
): string {
    return target.buildConfig?.trim()
        ? resolve(cwd, target.buildConfig)
        : resolve(cwd, target.rootDir, "mainz.build.ts");
}

function inferDefaultProfileBasePath(targetName: string): string {
    return targetName === "site" ? "/" : `/${targetName}/`;
}

async function resolveGithubPagesWorkflowTargets(
    normalizedConfig: NormalizedMainzConfig,
    runtime: MainzToolingRuntime,
): Promise<Array<{ name: string; basePath: string; outDir: string; stagingPath: string }>> {
    const cwd = runtime.cwd();
    const targets: Array<{ name: string; basePath: string; outDir: string; stagingPath: string }> =
        [];
    const stagingPaths = new Map<string, string>();

    for (const target of normalizedConfig.targets) {
        let metadata: Awaited<ReturnType<typeof resolveEnginePublicationMetadata>>;
        try {
            metadata = await resolveEnginePublicationMetadata(target, "gh-pages", cwd, runtime);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (message.includes('does not define profile "gh-pages"')) {
                continue;
            }

            throw error;
        }

        const stagingPath = normalizeWorkflowStagingPath(metadata.basePath);
        const conflict = stagingPaths.get(stagingPath);
        if (conflict) {
            throw new Error(
                `Targets "${conflict}" and "${target.name}" both resolve to the GitHub Pages staging path "${
                    stagingPath || "/"
                }".`,
            );
        }

        stagingPaths.set(stagingPath, target.name);
        targets.push({
            name: target.name,
            basePath: metadata.basePath,
            outDir: metadata.outDir,
            stagingPath,
        });
    }

    return targets;
}

function normalizeWorkflowStagingPath(basePath: string): string {
    const trimmed = basePath.trim();
    if (!trimmed || trimmed === "/") {
        return "";
    }

    return trimmed.replace(/^\/+|\/+$/g, "");
}

function renderGithubPagesWorkflowTemplateParams(options: {
    branch: string;
    trigger: "push" | "manual";
    targets: Array<{ name: string; basePath: string; outDir: string; stagingPath: string }>;
}): Record<string, string> {
    const triggerBlock = options.trigger === "manual"
        ? [
            "on:",
            "    workflow_dispatch:",
        ].join("\n")
        : [
            "on:",
            "    push:",
            "        branches:",
            `            - ${options.branch}`,
            "    workflow_dispatch:",
        ].join("\n");

    const buildSteps = options.targets.map((target) =>
        [
            `            - name: Build ${target.name}`,
            `              run: deno task build --target ${target.name} --profile gh-pages`,
        ].join("\n")
    ).join("\n\n");

    const metadataCommands = options.targets.map((target) =>
        `                  ${target.name}_metadata="$(deno run -A --config deno.json jsr:@mainz/cli-deno@alpha publish-info --target ${target.name} --profile gh-pages)"`
    ).join("\n");

    const metadataEchoes = options.targets.map((target) =>
        `                  echo "$${target.name}_metadata"`
    ).join("\n");

    const artifactCommands = options.targets.map((target) =>
        `                  ${target.name}_artifact_dir="$(METADATA="$${target.name}_metadata" deno eval 'console.log(JSON.parse(Deno.env.get("METADATA")!).outDir)')"`
    ).join("\n");

    const stagingCommands = options.targets.map((target) => {
        if (!target.stagingPath) {
            return `                  cp -a "$${target.name}_artifact_dir"/. "$staging_dir"/`;
        }

        return [
            `                  mkdir -p "$staging_dir/${target.stagingPath}"`,
            `                  cp -a "$${target.name}_artifact_dir"/. "$staging_dir/${target.stagingPath}"/`,
        ].join("\n");
    }).join("\n");

    return {
        triggerBlock,
        buildSteps,
        metadataCommands,
        metadataEchoes,
        artifactCommands,
        stagingCommands,
    };
}

function resolveTemplateTarget(manifest: Record<string, unknown>): {
    name: string;
    rootDir: string;
    appFile: string;
    appId: string;
    outDir: string;
} {
    const target = manifest.target;
    if (!target || typeof target !== "object") {
        throw new Error(`Template "${String(manifest.name ?? "unknown")}" must define a target.`);
    }

    for (const key of ["name", "rootDir", "appFile", "appId", "outDir"] as const) {
        const value = (target as Record<string, unknown>)[key];
        if (typeof value !== "string" || !value.trim()) {
            throw new Error(
                `Template "${String(manifest.name ?? "unknown")}" target is missing "${key}".`,
            );
        }
    }

    return target as {
        name: string;
        rootDir: string;
        appFile: string;
        appId: string;
        outDir: string;
    };
}

function renderGeneratedMainzCliSpecifier(mainzSpecifier: string): string {
    const trimmed = mainzSpecifier.trim().replace(/\/+$/, "");
    const jsrMainzMatch = trimmed.match(/^jsr:@mainz\/mainz(@.+)?$/);
    if (jsrMainzMatch) {
        return `jsr:@mainz/cli-deno${jsrMainzMatch[1] ?? ""}`;
    }

    return trimmed;
}

function renderGeneratedMainzSubpathPrefix(mainzSpecifier: string): string {
    const trimmed = mainzSpecifier.trim().replace(/\/+$/, "");
    if (trimmed.startsWith("jsr:@")) {
        return `jsr:/${trimmed.slice("jsr:".length)}/`;
    }

    return `${trimmed}/`;
}

function renderGeneratedNodeMainzSpecifier(mainzSpecifier: string): string {
    const trimmed = mainzSpecifier.trim().replace(/\/+$/, "");
    const jsrMainzMatch = trimmed.match(/^jsr:@mainz\/mainz(@.+)?$/);
    if (jsrMainzMatch) {
        return `npm:@jsr/mainz__mainz${jsrMainzMatch[1] ?? ""}`;
    }

    return trimmed;
}

function toKebabCase(value: string): string {
    return value.replaceAll("_", "-").replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
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
    const denoNotFound = globalThis.Deno?.errors?.NotFound;
    return (typeof denoNotFound === "function" && error instanceof denoNotFound) ||
        (typeof error === "object" && error !== null && (
            ("name" in error && error.name === "NotFound") ||
            ("code" in error && error.code === "ENOENT")
        ));
}

function isCommandNotFoundError(error: unknown): boolean {
    return isNotFoundError(error);
}

function getCliBootstrapEnv(): string | undefined {
    return globalThis.Deno?.env?.get(projectConfigBootstrapEnv) ??
        process.env[projectConfigBootstrapEnv];
}

function resolveBootstrapMainzImports(
    dependency: string | undefined,
):
    | Record<"mainz" | "mainz/config" | "mainz/jsx-runtime" | "mainz/jsx-dev-runtime", string>
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
    hostRuntime: SupportedCliRuntime,
): Promise<MainzToolingRuntime> {
    const runtime = await resolveProjectRuntimePreference(command, hostRuntime);
    return resolveToolingRuntime(runtime);
}

async function resolveProjectRuntimePreference(
    options: Pick<SharedCliOptions, "runtime" | "configPath">,
    hostRuntime: SupportedCliRuntime,
): Promise<SupportedCliRuntime> {
    if (options.runtime) {
        return resolveSupportedCliRuntime(options.runtime);
    }

    const projectRuntime = await readProjectRuntime(
        options.configPath ?? "mainz.config.ts",
        resolveToolingRuntime(hostRuntime),
    );
    return resolveSupportedCliRuntime(projectRuntime ?? hostRuntime);
}

async function readProjectRuntime(
    configPath: string,
    runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<MainzRuntime | undefined> {
    const absoluteConfigPath = resolve(configPath);
    if (!(await pathExists(absoluteConfigPath, runtime))) {
        return undefined;
    }

    const source = await runtime.readTextFile(absoluteConfigPath);
    const match = source.match(/\bruntime\s*:\s*["'](deno|node|bun)["']/);
    return match?.[1] as MainzRuntime | undefined;
}

function detectHostRuntime(): SupportedCliRuntime {
    if (
        typeof globalThis.Deno !== "undefined" && typeof globalThis.Deno.version?.deno === "string"
    ) {
        return "deno";
    }

    return "node";
}

function resolveSupportedCliRuntime(runtime: MainzRuntime): SupportedCliRuntime {
    if (runtime === "deno" || runtime === "node") {
        return runtime;
    }

    throw new Error('Runtime "bun" is not implemented yet.');
}
