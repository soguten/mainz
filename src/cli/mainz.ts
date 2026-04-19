/// <reference lib="deno.ns" />

import { dirname, isAbsolute, relative, resolve } from "node:path";
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
import {
    type AppScaffoldNavigation,
    type AppScaffoldTarget,
    type AppScaffoldType,
    createAppScaffold,
} from "./app-scaffold.ts";

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

type AppCommandOptions = {
    command: "app";
    action: "create" | "remove";
    name: string;
    type?: AppScaffoldType;
    root?: string;
    outDir?: string;
    navigation?: AppScaffoldNavigation;
    configPath?: string;
    deleteFiles?: boolean;
};

type MainzCliCommand =
    | BuildCommandOptions
    | DevCommandOptions
    | PreviewCommandOptions
    | TestCommandOptions
    | PublishInfoCommandOptions
    | DiagnoseCommandOptions
    | AppCommandOptions;

if (import.meta.main) {
    await main(Deno.args);
}

export async function main(args: string[]): Promise<void> {
    const command = parseCliCommand(args);
    if (!command) {
        printHelp();
        return;
    }

    if (command.command === "app") {
        await runAppCommand(command);
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
        command !== "diagnose" &&
        command !== "app"
    ) {
        throw new Error(
            `Unknown command "${command}". Use "build", "dev", "preview", "test", "publish-info", "diagnose", or "app".`,
        );
    }

    if (command === "app") {
        return parseAppCommand(rest);
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

function parseAppCommand(args: string[]): AppCommandOptions {
    const [action, maybeName, ...rest] = args;

    if (action !== "create" && action !== "remove") {
        throw new Error('Command "app" requires "create" or "remove".');
    }

    const positionalName = maybeName?.startsWith("--") ? undefined : maybeName;
    const remaining = positionalName ? rest : [maybeName, ...rest].filter(Boolean);

    const options: Pick<
        AppCommandOptions,
        "type" | "root" | "outDir" | "navigation" | "configPath" | "deleteFiles"
    > = {};
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

function parseCommandOptions(
    command: Exclude<MainzCliCommand["command"], "app">,
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

async function runAppCommand(options: AppCommandOptions): Promise<void> {
    if (options.action === "create") {
        await runAppCreateCommand(options);
        return;
    }

    await runAppRemoveCommand(options);
}

async function runAppCreateCommand(options: AppCommandOptions): Promise<void> {
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
    });

    for (const relativePath of scaffold.files.keys()) {
        const path = resolve(rootPath, relativePath);
        if (await pathExists(path)) {
            throw new Error(`Refusing to overwrite existing file "${path}".`);
        }
    }

    for (const directory of scaffold.directories) {
        await Deno.mkdir(resolve(rootPath, directory), { recursive: true });
    }

    for (const [relativePath, content] of scaffold.files) {
        await Deno.writeTextFile(resolve(rootPath, relativePath), content);
    }

    await upsertConfigTarget(configPath, renderConfigTarget(scaffold.target));

    console.log(`[mainz] Created app "${appName}" in ${rootDir}.`);
}

async function runAppRemoveCommand(options: AppCommandOptions): Promise<void> {
    const appName = normalizeAppName(options.name);
    const configPath = options.configPath ?? "mainz.config.ts";
    const absoluteConfigPath = resolve(configPath);
    const content = await Deno.readTextFile(absoluteConfigPath);
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

        await removeAppRoot(rootDir);
    }

    await Deno.writeTextFile(absoluteConfigPath, updated);
    console.log(`[mainz] Removed app target "${appName}" from ${configPath}.`);

    if (options.deleteFiles) {
        console.log(`[mainz] Deleted app files for "${appName}".`);
    }
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
            "  mainz app create [<name>|--name <name>] [--type <routed|root>] [--root <path>] [--out-dir <path>] [--navigation <spa|mpa|enhanced-mpa>] [--config <path>]",
            "  mainz app remove [<target>|--target <target>] [--delete-files] [--config <path>]",
            "  mainz build [--target <name|all>] [--profile <name>] [--config <path>]",
            "  mainz dev --target <name> [--profile <name>] [--config <path>]",
            "  mainz preview --target <name> [--profile <name>] [--host <host>] [--port <port>] [--config <path>]",
            "  mainz test [--target <name|all>] [--config <path>]",
            "  mainz publish-info --target <name> [--profile <name>] [--config <path>]",
            "  mainz diagnose [--target <name|all>] [--app <id>] [--format <json|human>] [--fail-on <never|error|warning>] [--config <path>]",
            "",
            "Examples:",
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

async function upsertConfigTarget(configPath: string, target: string): Promise<void> {
    const absoluteConfigPath = resolve(configPath);

    if (!(await pathExists(absoluteConfigPath))) {
        await Deno.mkdir(dirname(absoluteConfigPath), { recursive: true });
        await Deno.writeTextFile(absoluteConfigPath, renderGeneratedConfig(target));
        return;
    }

    const content = await Deno.readTextFile(absoluteConfigPath);
    await Deno.writeTextFile(absoluteConfigPath, insertConfigTarget(content, target));
}

function renderGeneratedConfig(target: string): string {
    return [
        'import { defineMainzConfig } from "mainz/config";',
        "",
        "export default defineMainzConfig({",
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

async function removeAppRoot(rootDir: string): Promise<void> {
    const cwd = Deno.cwd();
    const rootPath = resolve(cwd, rootDir);
    const relativeRoot = relative(cwd, rootPath);

    if (!relativeRoot || relativeRoot.startsWith("..") || isAbsolute(relativeRoot)) {
        throw new Error(`Refusing to delete app root outside the current workspace: "${rootDir}".`);
    }

    if (await pathExists(rootPath)) {
        await Deno.remove(rootPath, { recursive: true });
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
        ...(target.pagesDir ? [`            pagesDir: ${JSON.stringify(target.pagesDir)},`] : []),
        `            outDir: ${JSON.stringify(target.outDir)},`,
        "        },",
    ].join("\n");
}

async function pathExists(path: string): Promise<boolean> {
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
