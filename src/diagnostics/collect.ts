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
} from "../routing/diagnostics/index.ts";
import type { NormalizedMainzTarget } from "../config/index.ts";
import {
    collectFilesystemFiles,
    resolveTargetDiscoveredPagesForTarget,
} from "../cli/route-pages.ts";
import { diagnosticsContributors } from "./contributors.ts";
import {
    createDiagnosticsTargetModel,
    type DiagnosticsContributor,
    type DiagnosticsSourceInput,
    type DiagnosticsTargetInput,
    type DiagnosticsTargetModel,
    type MainzDiagnostic,
} from "./core/target-model.ts";

export async function collectDiagnosticsFromInput(
    input: DiagnosticsTargetInput,
): Promise<readonly MainzDiagnostic[]> {
    return await collectDiagnosticsFromModel(createDiagnosticsTargetModel(input));
}

export async function collectDiagnosticsFromModel(
    model: DiagnosticsTargetModel,
    contributors: readonly DiagnosticsContributor[] = diagnosticsContributors,
): Promise<readonly MainzDiagnostic[]> {
    const diagnostics = await Promise.all(
        contributors.map((contributor) => contributor.collect(model)),
    );

    return diagnostics.flat().sort(compareMainzDiagnostics);
}

export async function collectDiagnosticsForTarget(
    target: NormalizedMainzTarget,
    cwd = Deno.cwd(),
): Promise<readonly MainzDiagnostic[]> {
    const { discoveredPages, discoveryErrors } = await resolveTargetDiscoveredPagesForTarget(
        target,
        cwd,
    );
    const pages = (discoveredPages ?? []).map((page) => ({
        file: page.file,
        exportName: page.exportName,
        page: {
            path: page.path,
            mode: page.mode,
            hasExplicitRenderMode: page.hasExplicitRenderMode,
            notFound: page.notFound,
            locales: page.locales,
            authorization: page.authorization,
        },
    }));
    const sourceInputs = await discoverTargetSourceInputs(target, cwd);
    const routePathsByOwner = new Map(
        (discoveredPages ?? []).map((page) => [`${page.file}::${page.exportName}`, page.path]),
    );
    const diagnostics = await collectDiagnosticsFromModel(createDiagnosticsTargetModel({
        pages,
        sourceInputs,
        registeredPolicyNames: target.authorization?.policyNames ?? [],
        routePathsByOwner,
    }));

    if (!discoveryErrors?.length) {
        return diagnostics;
    }

    return [
        ...diagnostics,
        ...discoveryErrors.map((discoveryError) => ({
            code: toPageDiscoveryDiagnosticCode(discoveryError.kind),
            severity: "error" as const,
            message: discoveryError.message,
            file: discoveryError.file,
            exportName: "(page discovery)",
        })),
    ].sort(compareMainzDiagnostics);
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

    return (readDiagnosticRoutePath(a) ?? "").localeCompare(readDiagnosticRoutePath(b) ?? "");
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
