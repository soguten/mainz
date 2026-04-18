/// <reference lib="deno.ns" />

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
    invalidLocalePageDiscoveryErrorKind,
    type PageDiscoveryErrorKind,
    pageDiscoveryFailedErrorKind,
} from "../routing/page-discovery-errors.ts";
import {
    invalidLocaleTagDiagnosticCode,
    pageDiscoveryFailedDiagnosticCode,
} from "./routing/index.ts";
import type { NormalizedMainzTarget } from "../config/index.ts";
import {
    collectFilesystemFiles,
    resolveTargetDiagnosticsEvaluationsForTarget,
} from "../routing/target-page-discovery.ts";
import {
    createDiagnosticsTargetModel,
    type DiagnosticsContributor,
    type DiagnosticsSourceInput,
    type DiagnosticsTargetInput,
    type DiagnosticsTargetModel,
    type MainzDiagnostic,
} from "./core/target-model.ts";
import { applyDiagnosticSuppressions } from "./core/suppressions.ts";

export async function collectDiagnosticsFromInput(
    input: DiagnosticsTargetInput,
): Promise<readonly MainzDiagnostic[]> {
    return await collectDiagnosticsFromModel(createDiagnosticsTargetModel(input));
}

export async function collectDiagnosticsFromModel(
    model: DiagnosticsTargetModel,
    contributors?: readonly DiagnosticsContributor[],
): Promise<readonly MainzDiagnostic[]> {
    const resolvedContributors = contributors ??
        (await import("./contributors.ts")).diagnosticsContributors;
    const diagnostics = await Promise.all(
        resolvedContributors.map((contributor) => contributor.collect(model)),
    );

    return [...applyDiagnosticSuppressions(diagnostics.flat(), model.sourceInputs, {
        routePathsByOwner: model.context.routePathsByOwner,
    })].sort(compareMainzDiagnostics);
}

export async function collectDiagnosticsForTarget(
    target: NormalizedMainzTarget,
    cwd = Deno.cwd(),
    selectedAppId?: string,
): Promise<
    readonly {
        appId?: string;
        diagnostics: readonly MainzDiagnostic[];
    }[]
> {
    const evaluations = await resolveTargetDiagnosticsEvaluationsForTarget(
        target,
        cwd,
        selectedAppId,
    );
    const sourceInputs = await discoverTargetSourceInputs(target, cwd);
    const collectedDiagnostics: Array<{ appId?: string; diagnostics: readonly MainzDiagnostic[] }> =
        [];

    for (const evaluation of evaluations) {
        const pages = evaluation.discoveredPages.map((page) => ({
            file: page.file,
            exportName: page.exportName,
            page: {
                path: page.path,
                mode: page.mode,
                hasExplicitRenderMode: page.hasExplicitRenderMode,
                notFound: page.notFound,
                declaredRoutePath: page.declaredRoutePath,
                locales: page.locales,
                authorization: page.authorization,
            },
        }));
        const routePathsByOwner = new Map(
            evaluation.discoveredPages.map((
                page,
            ) => [`${page.file}::${page.exportName}`, page.path]),
        );
        const diagnostics = evaluation.discoveryErrors?.length
            ? []
            : await collectDiagnosticsFromModel(createDiagnosticsTargetModel({
                pages,
                sourceInputs,
                registeredPolicyNames: evaluation.authorizationPolicyNames ?? [],
                routePathsByOwner,
                appId: evaluation.appId,
            }));

        collectedDiagnostics.push({
            appId: evaluation.appId,
            diagnostics: [
                ...diagnostics,
                ...((evaluation.discoveryErrors ?? []).map((discoveryError) => ({
                    code: toPageDiscoveryDiagnosticCode(discoveryError.kind),
                    severity: "error" as const,
                    message: discoveryError.message,
                    file: discoveryError.file,
                    exportName: "(page discovery)",
                }))),
            ].sort(compareMainzDiagnostics),
        });
    }

    return collectedDiagnostics;
}

function compareMainzDiagnostics(a: MainzDiagnostic, b: MainzDiagnostic): number {
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

function toPageDiscoveryDiagnosticCode(kind: PageDiscoveryErrorKind): string {
    if (kind === invalidLocalePageDiscoveryErrorKind) {
        return invalidLocaleTagDiagnosticCode;
    }

    if (kind === pageDiscoveryFailedErrorKind) {
        return pageDiscoveryFailedDiagnosticCode;
    }

    return pageDiscoveryFailedDiagnosticCode;
}

function readDiagnosticRoutePath(diagnostic: MainzDiagnostic): string | undefined {
    return "routePath" in diagnostic ? diagnostic.routePath : undefined;
}

async function discoverTargetSourceInputs(
    target: NormalizedMainzTarget,
    cwd: string,
): Promise<readonly DiagnosticsSourceInput[]> {
    const files = await collectTargetSourceFiles(target, cwd);
    const sources: DiagnosticsSourceInput[] = [];

    for (const file of files) {
        sources.push({
            file,
            source: await Deno.readTextFile(file),
        });
    }

    return sources;
}

async function collectTargetSourceFiles(
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

export const collectTargetDiagnostics = collectDiagnosticsFromInput;
export const collectTargetModelDiagnostics = collectDiagnosticsFromModel;
