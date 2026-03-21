/// <reference lib="deno.ns" />

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { NormalizedMainzConfig, NormalizedMainzTarget } from "../config/index.ts";
import {
    collectComponentDiagnostics,
    collectComponentSourceDiagnostics,
    collectRouteDiagnostics,
    type ComponentSourceDiagnosticsInput,
    type MainzDiagnosticCode,
    type MainzDiagnostic,
} from "../diagnostics/index.ts";
import { collectFilesystemFiles, resolveTargetDiscoveredPages } from "./route-pages.ts";

export interface DiagnoseCliOptions {
    target?: string;
    format?: "json" | "human";
    failOn?: "never" | "error" | "warning";
}

export interface CliTargetDiagnostic extends MainzDiagnostic {
    target: string;
}

export async function collectCliDiagnostics(
    config: NormalizedMainzConfig,
    options: DiagnoseCliOptions,
    cwd = Deno.cwd(),
): Promise<readonly CliTargetDiagnostic[]> {
    const diagnostics: CliTargetDiagnostic[] = [];

    for (const target of resolveDiagnoseTargets(config, options.target)) {
        const { discoveredPages, discoveryErrors } = await resolveTargetDiscoveredPages(target.pagesDir, cwd);
        if (discoveredPages?.length) {
            const targetDiagnostics = await collectRouteDiagnostics(
                discoveredPages.map((page) => ({
                    file: page.file,
                    exportName: page.exportName,
                    page: {
                        path: page.path,
                        mode: page.mode,
                        hasExplicitRenderMode: page.hasExplicitRenderMode,
                        notFound: page.notFound,
                        locales: page.locales,
                    },
                })),
            );
            diagnostics.push(
                ...targetDiagnostics.map((diagnostic) => ({
                    ...diagnostic,
                    target: target.name,
                })),
            );
        }

        if (discoveryErrors?.length) {
            diagnostics.push(
                ...discoveryErrors.map((discoveryError) => ({
                    target: target.name,
                    code: classifyPageDiscoveryError(discoveryError.message),
                    severity: "error" as const,
                    message: discoveryError.message,
                    file: discoveryError.file,
                    exportName: "(page discovery)",
                })),
            );
        }

        const componentSources = await discoverTargetComponentSources(target, cwd);
        const componentDiagnostics = await collectComponentDiagnostics(componentSources);
        diagnostics.push(
            ...componentDiagnostics.map((diagnostic) => ({
                ...diagnostic,
                target: target.name,
            })),
        );

        const componentSourceDiagnostics = await collectComponentSourceDiagnostics(componentSources);
        diagnostics.push(
            ...componentSourceDiagnostics.map((diagnostic) => ({
                ...diagnostic,
                target: target.name,
            })),
        );
    }

    return diagnostics.sort(compareDiagnostics);
}

export function formatCliDiagnosticsJson(
    diagnostics: readonly CliTargetDiagnostic[],
): string {
    return JSON.stringify(diagnostics, null, 2);
}

export function formatCliDiagnosticsHuman(
    diagnostics: readonly CliTargetDiagnostic[],
): string {
    if (diagnostics.length === 0) {
        return "No diagnostics found.";
    }

    const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;
    const warnings = diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length;
    const byTarget = groupDiagnosticsByTarget(diagnostics);

    const sections = [
        `Diagnostics summary: ${errors} error(s), ${warnings} warning(s)`,
    ];

    for (const [target, targetDiagnostics] of byTarget) {
        sections.push([
            `Target: ${target}`,
            ...targetDiagnostics.map((diagnostic) =>
                [
                    `${diagnostic.severity} ${diagnostic.code}`,
                    `  export: ${diagnostic.exportName}`,
                    `  file: ${diagnostic.file}`,
                    ...(diagnostic.routePath ? [`  route: ${diagnostic.routePath}`] : []),
                    `  ${diagnostic.message}`,
                ].join("\n")
            ),
        ].join("\n\n"));
    }

    return sections.join("\n\n");
}

export function shouldFailCliDiagnostics(
    diagnostics: readonly CliTargetDiagnostic[],
    failOn: "never" | "error" | "warning" = "never",
): boolean {
    if (failOn === "never") {
        return false;
    }

    if (failOn === "warning") {
        return diagnostics.length > 0;
    }

    return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}

function resolveDiagnoseTargets(
    config: NormalizedMainzConfig,
    targetSelection: string | undefined,
): readonly NormalizedMainzTarget[] {
    const targetName = targetSelection?.trim();
    if (!targetName || targetName === "all") {
        return config.targets;
    }

    const selectedTargets = config.targets.filter((target) => target.name === targetName);
    if (selectedTargets.length === 0) {
        throw new Error(
            `No targets matched "${targetName}". Available targets: ${
                config.targets.map((target) => target.name).join(", ")
            }`,
        );
    }

    return selectedTargets;
}

function compareDiagnostics(a: CliTargetDiagnostic, b: CliTargetDiagnostic): number {
    if (a.target !== b.target) {
        return a.target.localeCompare(b.target);
    }

    if (a.severity !== b.severity) {
        return a.severity.localeCompare(b.severity);
    }

    if (a.code !== b.code) {
        return a.code.localeCompare(b.code);
    }

    if (a.file !== b.file) {
        return a.file.localeCompare(b.file);
    }

    if (a.exportName !== b.exportName) {
        return a.exportName.localeCompare(b.exportName);
    }

    return (a.routePath ?? "").localeCompare(b.routePath ?? "");
}

function groupDiagnosticsByTarget(
    diagnostics: readonly CliTargetDiagnostic[],
): ReadonlyMap<string, readonly CliTargetDiagnostic[]> {
    const grouped = new Map<string, CliTargetDiagnostic[]>();

    for (const diagnostic of diagnostics) {
        const targetDiagnostics = grouped.get(diagnostic.target) ?? [];
        targetDiagnostics.push(diagnostic);
        grouped.set(diagnostic.target, targetDiagnostics);
    }

    return grouped;
}

function classifyPageDiscoveryError(message: string): MainzDiagnosticCode {
    if (message.includes("@Locales() received invalid locale")) {
        return "invalid-locale-tag";
    }

    return "page-discovery-failed";
}

async function discoverTargetComponentSources(
    target: NormalizedMainzTarget,
    cwd: string,
): Promise<readonly ComponentSourceDiagnosticsInput[]> {
    const files = await collectTargetComponentFiles(target, cwd);
    const sources: ComponentSourceDiagnosticsInput[] = [];

    for (const file of files) {
        sources.push({
            file,
            source: await Deno.readTextFile(file),
        });
    }

    return sources;
}

async function collectTargetComponentFiles(
    target: NormalizedMainzTarget,
    cwd: string,
): Promise<readonly string[]> {
    const sourceDir = resolve(cwd, target.rootDir, "src");
    if (!existsSync(sourceDir)) {
        return [];
    }

    const files = await collectFilesystemFiles(sourceDir);
    return files.filter((file) => {
        if (!/\.(ts|tsx|mts|cts)$/.test(file)) {
            return false;
        }

        return !/(\.test\.|\.fixture\.)/.test(file);
    });
}
