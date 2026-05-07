import type { NormalizedMainzTarget } from "../../config/index.ts";
import {
  invalidLocalePageDiscoveryErrorKind,
  type PageDiscoveryErrorKind,
  pageDiscoveryFailedErrorKind,
} from "../../routing/page-discovery-errors.ts";
import type {
  CliDiscoveredPage,
  CliPageDiscoveryError,
} from "../../routing/target-page-discovery.ts";
import {
  createDiagnosticsTargetModel,
  type DiagnosticsTargetModel,
  type MainzDiagnostic,
} from "./target-model.ts";
import { discoverTargetSourceInputs } from "./source-inputs.ts";
import { resolveTargetDiagnosticsEvaluationsForTarget } from "../routing/target-evaluation.ts";

export interface BuiltDiagnosticsTargetModel {
  appId?: string;
  model?: DiagnosticsTargetModel;
  discoveryDiagnostics: readonly MainzDiagnostic[];
}

export async function buildDiagnosticsTargetModelsForTarget(
  target: NormalizedMainzTarget,
  cwd = Deno.cwd(),
  selectedAppId?: string,
): Promise<readonly BuiltDiagnosticsTargetModel[]> {
  const evaluations = await resolveTargetDiagnosticsEvaluationsForTarget(
    target,
    cwd,
    selectedAppId,
  );
  const sourceInputs = await discoverTargetSourceInputs(target, cwd);

  return evaluations.map((evaluation) => {
    const discoveryDiagnostics = collectDiscoveryDiagnostics(
      evaluation.discoveryErrors,
    );

    if (discoveryDiagnostics.length > 0) {
      return {
        appId: evaluation.appId,
        discoveryDiagnostics,
      };
    }

    return {
      appId: evaluation.appId,
      model: createDiagnosticsTargetModel({
        pages: toRouteDiagnosticsPages(evaluation.discoveredPages),
        sourceInputs,
        registeredPolicyNames: evaluation.authorizationPolicyNames ?? [],
        routePathsByOwner: createRoutePathsByOwner(evaluation.discoveredPages),
        appId: evaluation.appId,
      }),
      discoveryDiagnostics,
    };
  });
}

function toRouteDiagnosticsPages(
  discoveredPages: readonly CliDiscoveredPage[],
) {
  return discoveredPages.map((page) => ({
    file: page.file,
    exportName: page.exportName,
    page: {
      path: page.path,
      mode: page.mode,
      notFound: page.notFound,
      locales: page.locales,
      authorization: page.authorization,
    },
  }));
}

function createRoutePathsByOwner(
  discoveredPages: readonly CliDiscoveredPage[],
): ReadonlyMap<string, string> {
  return new Map(
    discoveredPages.map((
      page,
    ) => [`${page.file}::${page.exportName}`, page.path]),
  );
}

function collectDiscoveryDiagnostics(
  discoveryErrors: readonly CliPageDiscoveryError[] | undefined,
): readonly MainzDiagnostic[] {
  return (discoveryErrors ?? []).map((discoveryError) => ({
    code: toPageDiscoveryDiagnosticCode(discoveryError.kind),
    severity: "error" as const,
    message: discoveryError.message,
    file: discoveryError.file,
    exportName: "(page discovery)",
  }));
}

function toPageDiscoveryDiagnosticCode(kind: PageDiscoveryErrorKind): string {
  if (kind === invalidLocalePageDiscoveryErrorKind) {
    return "invalid-locale-tag";
  }

  if (kind === pageDiscoveryFailedErrorKind) {
    return "page-discovery-failed";
  }

  return "page-discovery-failed";
}
