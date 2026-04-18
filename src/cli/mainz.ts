/// <reference lib="deno.ns" />

import { resolve } from "node:path";
import type {
    LoadedMainzConfig,
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

type SharedCliOptions = {
    target?: string;
    profile?: string;
    configPath?: string;
};

type BuildCommandOptions = SharedCliOptions & {
    command: "build";
};

type DevCommandOptions = SharedCliOptions & {
    command: "dev";
};

type PreviewCommandOptions = SharedCliOptions & {
    command: "preview";
    host?: string;
    port?: number;
};

type TestCommandOptions = SharedCliOptions & {
    command: "test";
};

type PublishInfoCommandOptions = SharedCliOptions & {
    command: "publish-info";
};

type DiagnoseCommandOptions = SharedCliOptions & {
    command: "diagnose";
    app?: string;
    format?: "json" | "human";
    failOn?: "never" | "error" | "warning";
};

type MainzCliCommand =
    | BuildCommandOptions
    | DevCommandOptions
    | PreviewCommandOptions
    | TestCommandOptions
    | PublishInfoCommandOptions
    | DiagnoseCommandOptions;

if (import.meta.main) {
    await main(Deno.args);
}

export async function main(args: string[]): Promise<void> {
    const command = parseCliCommand(args);
    if (!command) {
        printHelp();
        return;
    }

    const loadedConfig = await loadMainzConfig(command.configPath);
    const normalizedConfig = normalizeMainzConfig(loadedConfig.config);

    switch (command.command) {
        case "publish-info":
            await runPublishInfoCommand(command, normalizedConfig);
            return;
        case "diagnose":
            await runDiagnoseCommand(command, normalizedConfig);
            return;
        case "dev":
            await runDevCommand(command, loadedConfig, normalizedConfig);
            return;
        case "preview":
            await runPreviewCommand(command, loadedConfig, normalizedConfig);
            return;
        case "test":
            await runTestCommand(command, normalizedConfig);
            return;
        case "build":
            await runBuildCommand(command, loadedConfig, normalizedConfig);
            return;
    }
}

function parseCliCommand(args: string[]): MainzCliCommand | undefined {
    const [command, ...rest] = args;

    if (!command || command === "help" || command === "--help" || command === "-h") {
        return undefined;
    }

    if (
        command !== "build" && command !== "dev" && command !== "preview" && command !== "test" &&
        command !== "publish-info" &&
        command !== "diagnose"
    ) {
        throw new Error(
            `Unknown command "${command}". Use "build", "dev", "preview", "test", "publish-info", or "diagnose".`,
        );
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

function parseCommandOptions(
    command: MainzCliCommand["command"],
    args: string[],
):
    & SharedCliOptions
    & Pick<DiagnoseCommandOptions, "app" | "format" | "failOn">
    & Pick<PreviewCommandOptions, "host" | "port"> {
    const options:
        & SharedCliOptions
        & Pick<DiagnoseCommandOptions, "app" | "format" | "failOn">
        & Pick<PreviewCommandOptions, "host" | "port"> = {};

    for (let index = 0; index < args.length; index += 1) {
        const current = args[index];

        if (current === "--target") {
            options.target = args[index + 1];
            index += 1;
            continue;
        }

        if (current === "--mode") {
            throw new Error(
                command === "build" || command === "publish-info"
                    ? `Command "${command}" no longer accepts --mode. Render mode is now page-owned in production builds.`
                    : `Unknown option "${current}".`,
            );
        }

        if (current === "--profile") {
            options.profile = args[index + 1];
            index += 1;
            continue;
        }

        if (current === "--navigation") {
            throw new Error(
                command === "build" || command === "dev" || command === "preview" ||
                    command === "publish-info"
                    ? `Command "${command}" no longer accepts --navigation. Navigation is now app-owned in defineApp(...) and falls back to spa.`
                    : `Unknown option "${current}".`,
            );
        }

        if (current === "--config") {
            options.configPath = args[index + 1];
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
            if (command !== "preview") {
                throw new Error(`Unknown option "${current}".`);
            }

            options.host = args[index + 1];
            index += 1;
            continue;
        }

        if (current === "--port") {
            if (command !== "preview") {
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

async function runBuildCommand(
    options: BuildCommandOptions,
    loadedConfig: LoadedMainzConfig,
    normalizedConfig: NormalizedMainzConfig,
): Promise<void> {
    const jobs = await resolveEngineBuildJobs(normalizedConfig, options);
    const selectedTargets = new Map(jobs.map((job) => [job.target.name, job.target]));
    const resolvedProfileByTarget = new Map<
        string,
        Awaited<ReturnType<typeof resolveEngineBuildProfile>>
    >();
    for (const target of selectedTargets.values()) {
        resolvedProfileByTarget.set(
            target.name,
            await resolveEngineBuildProfile(target, options.profile),
        );
    }

    const resolvedJobs = jobs.map((job) => ({
        ...job,
        profile: resolvedProfileByTarget.get(job.target.name)!,
    }));

    console.log(
        `[mainz] Building ${resolvedJobs.length} job(s) using config ${loadedConfig.path}`,
    );

    await runEngineBuildJobs(normalizedConfig, resolvedJobs);

    console.log("[mainz] Build completed successfully.");
}

async function runPublishInfoCommand(
    options: PublishInfoCommandOptions,
    normalizedConfig: NormalizedMainzConfig,
): Promise<void> {
    const target = resolveRequiredTarget(normalizedConfig, options.target, "publish-info");
    const metadata = await resolveEnginePublicationMetadata(target, options.profile, Deno.cwd());
    console.log(JSON.stringify(metadata, null, 2));
}

async function runDevCommand(
    options: DevCommandOptions,
    loadedConfig: LoadedMainzConfig,
    normalizedConfig: NormalizedMainzConfig,
): Promise<void> {
    const target = resolveRequiredTarget(normalizedConfig, options.target, "dev");
    const profile = await resolveEngineBuildProfile(target, options.profile);

    console.log(
        `[mainz] Starting dev server for target "${target.name}" using config ${loadedConfig.path}`,
    );

    await runEngineDevServer(normalizedConfig, target, profile);
}

async function runPreviewCommand(
    options: PreviewCommandOptions,
    loadedConfig: LoadedMainzConfig,
    normalizedConfig: NormalizedMainzConfig,
): Promise<void> {
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
    );

    const metadata = await resolveEnginePublicationMetadata(
        target,
        options.profile,
        Deno.cwd(),
    );

    serveArtifactPreview({
        rootDir: metadata.outDir,
        host: options.host,
        port: options.port,
    });

    await new Promise(() => undefined);
}

async function runDiagnoseCommand(
    options: DiagnoseCommandOptions,
    normalizedConfig: NormalizedMainzConfig,
): Promise<void> {
    const diagnostics = await collectDiagnosticsForConfig(normalizedConfig, options, Deno.cwd());
    const format = resolveDiagnoseFormat(options.format);
    console.log(
        format === "human"
            ? formatDiagnosticsHuman(diagnostics)
            : formatDiagnosticsJson(diagnostics),
    );
    if (shouldFailDiagnostics(diagnostics, resolveDiagnoseFailOn(options.failOn))) {
        Deno.exit(1);
    }
}

async function runTestCommand(
    options: TestCommandOptions,
    normalizedConfig: NormalizedMainzConfig,
): Promise<void> {
    const testPaths = resolveTestPathsForTarget(normalizedConfig, options.target);
    const command = new Deno.Command("deno", {
        cwd: Deno.cwd(),
        args: [
            "test",
            "-A",
            ...testPaths,
        ],
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
    });

    const child = command.spawn();
    const status = await child.status;
    if (!status.success) {
        Deno.exit(status.code);
    }
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
            "  mainz build [--target <name|all>] [--profile <name>] [--config <path>]",
            "  mainz dev --target <name> [--profile <name>] [--config <path>]",
            "  mainz preview --target <name> [--profile <name>] [--host <host>] [--port <port>] [--config <path>]",
            "  mainz test [--target <name|all>] [--config <path>]",
            "  mainz publish-info --target <name> [--profile <name>] [--config <path>]",
            "  mainz diagnose [--target <name|all>] [--app <id>] [--format <json|human>] [--fail-on <never|error|warning>] [--config <path>]",
            "",
            "Examples:",
            "  mainz build",
            "  mainz build --target site --profile gh-pages",
            "  mainz build --target playground",
            "  mainz dev --target playground",
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
): string[] {
    const normalizedTargetName = targetName?.trim();
    if (!normalizedTargetName) {
        return [];
    }

    if (normalizedTargetName === "all") {
        return Array.from(
            new Set(
                config.targets.map((target) =>
                    normalizePathSlashes(resolve(Deno.cwd(), target.rootDir))
                ),
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

    return [normalizePathSlashes(resolve(Deno.cwd(), target.rootDir))];
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
