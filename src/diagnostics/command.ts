/// <reference lib="deno.ns" />

import type { NormalizedMainzConfig, NormalizedMainzTarget } from "../config/index.ts";
import { collectDiagnosticsForTarget } from "./collect.ts";
import type { MainzDiagnostic } from "./core/target-model.ts";

export interface DiagnoseCommandOptions {
    target?: string;
    app?: string;
    format?: "json" | "human";
    failOn?: "never" | "error" | "warning";
}

export type TargetDiagnostic = MainzDiagnostic & {
    target: string;
    appId?: string;
};

export async function collectDiagnosticsForConfig(
    config: NormalizedMainzConfig,
    options: Pick<DiagnoseCommandOptions, "target" | "app">,
    cwd = Deno.cwd(),
): Promise<readonly TargetDiagnostic[]> {
    const diagnostics: TargetDiagnostic[] = [];

    for (const target of resolveDiagnoseTargets(config, options.target)) {
        const targetEvaluations = await collectDiagnosticsForTarget(target, cwd, options.app);
        for (const evaluation of targetEvaluations) {
            diagnostics.push(
                ...evaluation.diagnostics.map((diagnostic) => ({
                    ...diagnostic,
                    target: target.name,
                    appId: evaluation.appId,
                })),
            );
        }
    }

    return diagnostics.sort(compareDiagnostics);
}

export function formatDiagnosticsJson(
    diagnostics: readonly TargetDiagnostic[],
): string {
    return JSON.stringify(diagnostics, null, 2);
}

export function formatDiagnosticsHuman(
    diagnostics: readonly TargetDiagnostic[],
): string {
    if (diagnostics.length === 0) {
        return "No diagnostics.";
    }

    const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;
    const warnings = diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length;
    const byTarget = groupDiagnosticsByTarget(diagnostics);

    const sections = [
        `Diagnostics summary: ${errors} error(s), ${warnings} warning(s)`,
    ];

    for (const [target, targetDiagnostics] of byTarget) {
        const groupedByApp = groupDiagnosticsByApp(targetDiagnostics);
        sections.push([
            `Target: ${target}`,
            ...[...groupedByApp.entries()].map(([appId, appDiagnostics]) =>
                [
                    ...(appId ? [`App: ${appId}`] : []),
                    ...appDiagnostics.map((diagnostic) =>
                        [
                            `${diagnostic.severity} ${diagnostic.code}`,
                            `  export: ${diagnostic.exportName}`,
                            `  file: ${diagnostic.file}`,
                            ...(readDiagnosticRoutePath(diagnostic)
                                ? [`  route: ${readDiagnosticRoutePath(diagnostic)}`]
                                : []),
                            ...((diagnostic.subject?.length ?? 0) > 0
                                ? [`  subject: ${diagnostic.subject}`]
                                : []),
                            `  ${diagnostic.message}`,
                        ].join("\n")
                    ),
                ].join("\n\n")
            ),
        ].join("\n\n"));
    }

    return sections.join("\n\n");
}

export function shouldFailDiagnostics(
    diagnostics: readonly TargetDiagnostic[],
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

function compareDiagnostics(a: TargetDiagnostic, b: TargetDiagnostic): number {
    if (a.target !== b.target) {
        return a.target.localeCompare(b.target);
    }

    if ((a.appId ?? "") !== (b.appId ?? "")) {
        return (a.appId ?? "").localeCompare(b.appId ?? "");
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

    if ((readDiagnosticRoutePath(a) ?? "") !== (readDiagnosticRoutePath(b) ?? "")) {
        return (readDiagnosticRoutePath(a) ?? "").localeCompare(readDiagnosticRoutePath(b) ?? "");
    }

    return (a.subject ?? "").localeCompare(b.subject ?? "");
}

function groupDiagnosticsByTarget(
    diagnostics: readonly TargetDiagnostic[],
): ReadonlyMap<string, readonly TargetDiagnostic[]> {
    const grouped = new Map<string, TargetDiagnostic[]>();

    for (const diagnostic of diagnostics) {
        const targetDiagnostics = grouped.get(diagnostic.target) ?? [];
        targetDiagnostics.push(diagnostic);
        grouped.set(diagnostic.target, targetDiagnostics);
    }

    return grouped;
}

function groupDiagnosticsByApp(
    diagnostics: readonly TargetDiagnostic[],
): ReadonlyMap<string | undefined, readonly TargetDiagnostic[]> {
    const grouped = new Map<string | undefined, TargetDiagnostic[]>();

    for (const diagnostic of diagnostics) {
        const appDiagnostics = grouped.get(diagnostic.appId) ?? [];
        appDiagnostics.push(diagnostic);
        grouped.set(diagnostic.appId, appDiagnostics);
    }

    return grouped;
}

function readDiagnosticRoutePath(diagnostic: TargetDiagnostic): string | undefined {
    return "routePath" in diagnostic ? diagnostic.routePath : undefined;
}
