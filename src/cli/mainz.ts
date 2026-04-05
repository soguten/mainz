/// <reference lib="deno.ns" />

import type {
    LoadedMainzConfig,
    NormalizedMainzConfig,
    NormalizedMainzTarget,
} from "../config/index.ts";
import { loadMainzConfig, normalizeMainzConfig } from "../config/index.ts";
import {
    applyEngineBuildOverrides,
    resolveEngineBuildJobs,
    resolveEngineBuildProfile,
    resolveEnginePublicationMetadata,
    runEngineBuildJobs,
} from "../build/index.ts";
import {
    collectDiagnosticsForConfig,
    formatDiagnosticsHuman,
    formatDiagnosticsJson,
    shouldFailDiagnostics,
} from "../diagnostics/index.ts";

type SharedCliOptions = {
    target?: string;
    navigation?: string;
    profile?: string;
    configPath?: string;
};

type BuildCommandOptions = SharedCliOptions & {
    command: "build";
};

type PublishInfoCommandOptions = SharedCliOptions & {
    command: "publish-info";
};

type DiagnoseCommandOptions = SharedCliOptions & {
    command: "diagnose";
    format?: "json" | "human";
    failOn?: "never" | "error" | "warning";
};

type MainzCliCommand =
    | BuildCommandOptions
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

    if (command !== "build" && command !== "publish-info" && command !== "diagnose") {
        throw new Error(`Unknown command "${command}". Use "build", "publish-info", or "diagnose".`);
    }

    const options = parseCommandOptions(command, rest);

    if (command === "build") {
        return { command, ...options };
    }

    if (command === "publish-info") {
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
): SharedCliOptions & Pick<DiagnoseCommandOptions, "format" | "failOn"> {
    const options: SharedCliOptions & Pick<DiagnoseCommandOptions, "format" | "failOn"> = {};

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
            options.navigation = args[index + 1];
            index += 1;
            continue;
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

        if (current === "--fail-on") {
            options.failOn = args[index + 1] as "never" | "error" | "warning" | undefined;
            index += 1;
            continue;
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
    const resolvedProfileByTarget = new Map<string, Awaited<ReturnType<typeof resolveEngineBuildProfile>>>();
    for (const target of selectedTargets.values()) {
        resolvedProfileByTarget.set(
            target.name,
            applyEngineBuildOverrides(
                await resolveEngineBuildProfile(target, options.profile),
                options,
            ),
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
    const metadata = await resolveEnginePublicationMetadata(target, options.profile, Deno.cwd(), {
        navigation: options.navigation,
    });
    console.log(JSON.stringify(metadata, null, 2));
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

function resolveRequiredTarget(
    config: NormalizedMainzConfig,
    targetName: string | undefined,
    command: "publish-info",
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
            "  mainz build [--target <name|all>] [--profile <name>] [--navigation <spa|mpa|enhanced-mpa>] [--config <path>]",
            "  mainz publish-info --target <name> [--profile <name>] [--navigation <spa|mpa|enhanced-mpa>] [--config <path>]",
            "  mainz diagnose [--target <name|all>] [--format <json|human>] [--fail-on <never|error|warning>] [--config <path>]",
            "",
            "Examples:",
            "  mainz build",
            "  mainz build --target site --profile gh-pages",
            "  mainz build --target site --navigation spa",
            "  mainz build --target playground",
            "  mainz publish-info --target site --profile gh-pages",
            "  mainz publish-info --target site --navigation mpa",
            "  mainz diagnose",
            "  mainz diagnose --target docs",
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
