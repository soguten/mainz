#!/usr/bin/env -S deno run -A
/// <reference lib="deno.ns" />

import { loadMainzConfig, normalizeMainzConfig } from "../config/index.ts";
import {
    collectCliDiagnostics,
    formatCliDiagnosticsHuman,
    formatCliDiagnosticsJson,
    shouldFailCliDiagnostics,
} from "./diagnose.ts";
import {
    applyBuildCliOverrides,
    BuildCliOptions,
    resolveBuildJobs,
    resolvePublicationMetadata,
    resolveTargetBuildProfile,
    runBuildJobs,
} from "./build.ts";

type MainzCliOptions = BuildCliOptions & {
    format?: "json" | "human";
    failOn?: "never" | "error" | "warning";
};

if (import.meta.main) {
    await main(Deno.args);
}

export async function main(args: string[]): Promise<void> {
    const [command, ...rest] = args;

    if (!command || command === "help" || command === "--help" || command === "-h") {
        printHelp();
        return;
    }

    if (command !== "build" && command !== "publish-info" && command !== "diagnose") {
        throw new Error(`Unknown command "${command}". Use "build", "publish-info", or "diagnose".`);
    }

    const options = parseBuildOptions(rest);
    const loadedConfig = await loadMainzConfig(options.configPath);
    const normalizedConfig = normalizeMainzConfig(loadedConfig.config);

    if (command === "publish-info") {
        const targetName = options.target?.trim();
        if (!targetName || targetName === "all") {
            throw new Error('Command "publish-info" requires a single --target <name>.');
        }

        const target = normalizedConfig.targets.find((entry) => entry.name === targetName);
        if (!target) {
            throw new Error(
                `No targets matched "${targetName}". Available targets: ${
                    normalizedConfig.targets.map((entry) => entry.name).join(", ")
                }`,
            );
        }

        const metadata = await resolvePublicationMetadata(target, options.profile, Deno.cwd(), {
            mode: options.mode,
            navigation: options.navigation,
        });
        console.log(JSON.stringify(metadata, null, 2));
        return;
    }

    if (command === "diagnose") {
        const diagnostics = await collectCliDiagnostics(normalizedConfig, options, Deno.cwd());
        const format = resolveDiagnoseFormat(options.format);
        console.log(format === "human" ? formatCliDiagnosticsHuman(diagnostics) : formatCliDiagnosticsJson(diagnostics));
        if (shouldFailCliDiagnostics(diagnostics, resolveDiagnoseFailOn(options.failOn))) {
            Deno.exit(1);
        }
        return;
    }

    const jobs = resolveBuildJobs(normalizedConfig, options);
    const selectedTargets = new Map(jobs.map((job) => [job.target.name, job.target]));
    const resolvedProfileByTarget = new Map<
        string,
        Awaited<ReturnType<typeof resolveTargetBuildProfile>>
    >();
    for (const target of selectedTargets.values()) {
        resolvedProfileByTarget.set(
            target.name,
            applyBuildCliOverrides(
                await resolveTargetBuildProfile(target, options.profile),
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

    await runBuildJobs(normalizedConfig, resolvedJobs);

    console.log("[mainz] Build completed successfully.");
}

function parseBuildOptions(args: string[]): MainzCliOptions {
    const options: MainzCliOptions = {};

    for (let index = 0; index < args.length; index += 1) {
        const current = args[index];

        if (current === "--target") {
            options.target = args[index + 1];
            index += 1;
            continue;
        }

        if (current === "--mode") {
            options.mode = args[index + 1];
            index += 1;
            continue;
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

function printHelp(): void {
    console.log(
        [
            "Mainz CLI",
            "",
            "Usage:",
            "  mainz build [--target <name|all>] [--profile <name>] [--mode <csr|ssg|all>] [--navigation <spa|mpa|enhanced-mpa>] [--config <path>]",
            "  mainz publish-info --target <name> [--profile <name>] [--mode <csr|ssg>] [--navigation <spa|mpa|enhanced-mpa>] [--config <path>]",
            "  mainz diagnose [--target <name|all>] [--format <json|human>] [--fail-on <never|error|warning>] [--config <path>]",
            "",
            "Examples:",
            "  mainz build",
            "  mainz build --target site --profile gh-pages",
            "  mainz build --target site --mode csr --navigation spa",
            "  mainz build --target site --mode ssg",
            "  mainz build --target playground --mode csr",
            "  mainz publish-info --target site --profile gh-pages",
            "  mainz publish-info --target site --mode ssg --navigation mpa",
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

