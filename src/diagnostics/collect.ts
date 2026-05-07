import type { NormalizedMainzTarget } from "../config/index.ts";
import {
  createDiagnosticsTargetModel,
  type DiagnosticsContributor,
  type DiagnosticsTargetInput,
  type DiagnosticsTargetModel,
  type MainzDiagnostic,
} from "./core/target-model.ts";
import { buildDiagnosticsTargetModelsForTarget } from "./core/target-model-builder.ts";
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

  return [
    ...applyDiagnosticSuppressions(diagnostics.flat(), model.sourceInputs, {
      routePathsByOwner: model.context.routePathsByOwner,
    }),
  ].sort(compareMainzDiagnostics);
}

export async function collectDiagnosticsForTarget(
  target: NormalizedMainzTarget,
  cwd: string = Deno.cwd(),
  selectedAppId?: string,
): Promise<
  readonly {
    appId?: string;
    diagnostics: readonly MainzDiagnostic[];
  }[]
> {
  const targetModels = await buildDiagnosticsTargetModelsForTarget(
    target,
    cwd,
    selectedAppId,
  );
  const collectedDiagnostics: Array<
    { appId?: string; diagnostics: readonly MainzDiagnostic[] }
  > = [];

  for (const targetModel of targetModels) {
    const diagnostics = targetModel.model
      ? await collectDiagnosticsFromModel(targetModel.model)
      : [];
    collectedDiagnostics.push({
      appId: targetModel.appId,
      diagnostics: [
        ...diagnostics,
        ...targetModel.discoveryDiagnostics,
      ].sort(compareMainzDiagnostics),
    });
  }

  return collectedDiagnostics;
}

function compareMainzDiagnostics(
  a: MainzDiagnostic,
  b: MainzDiagnostic,
): number {
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

  if (
    (readDiagnosticRoutePath(a) ?? "") !== (readDiagnosticRoutePath(b) ?? "")
  ) {
    return (readDiagnosticRoutePath(a) ?? "").localeCompare(
      readDiagnosticRoutePath(b) ?? "",
    );
  }

  return (a.subject ?? "").localeCompare(b.subject ?? "");
}

function readDiagnosticRoutePath(
  diagnostic: MainzDiagnostic,
): string | undefined {
  return "routePath" in diagnostic ? diagnostic.routePath : undefined;
}

export const collectTargetDiagnostics: typeof collectDiagnosticsFromInput =
  collectDiagnosticsFromInput;
export const collectTargetModelDiagnostics: typeof collectDiagnosticsFromModel =
  collectDiagnosticsFromModel;
