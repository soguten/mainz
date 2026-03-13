#!/usr/bin/env -S deno run -A
/// <reference lib="deno.ns" />

import { loadMainzConfig, normalizeMainzConfig } from "../config/index.ts";
import { BuildCliOptions, resolveBuildJobs, runBuildJobs } from "./build.ts";

if (import.meta.main) {
    await main(Deno.args);
}

export async function main(args: string[]): Promise<void> {
    const [command, ...rest] = args;

    if (!command || command === "help" || command === "--help" || command === "-h") {
        printHelp();
        return;
    }

    if (command !== "build") {
        throw new Error(`Unknown command "${command}". Use "build".`);
    }

    const options = parseBuildOptions(rest);
    const loadedConfig = await loadMainzConfig(options.configPath);
    const normalizedConfig = normalizeMainzConfig(loadedConfig.config);
    const jobs = resolveBuildJobs(normalizedConfig, options);

    console.log(
        `[mainz] Building ${jobs.length} job(s) using config ${loadedConfig.path}`,
    );

    await runBuildJobs(normalizedConfig, jobs);

    console.log("[mainz] Build completed successfully.");
}

function parseBuildOptions(args: string[]): BuildCliOptions {
    const options: BuildCliOptions = {};

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

        if (current === "--config") {
            options.configPath = args[index + 1];
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
            "  mainz build [--target <name|all>] [--mode <csr|ssg|all>] [--config <path>]",
            "",
            "Examples:",
            "  mainz build",
            "  mainz build --target site --mode ssg",
            "  mainz build --target playground --mode csr",
            "",
            "Notes:",
            '  "spa" is kept as a legacy alias for "csr".',
        ].join("\n"),
    );
}
