import type { NormalizedMainzTarget } from "../../config/index.ts";
import {
  type AppDiscoveryCandidate,
  type CliDiscoveredPage,
  type CliPageDiscoveryError,
  compareAppDiscoveryCandidates,
  resolveTargetAppDiscoveryForTarget,
} from "../../routing/target-page-discovery.ts";
import { readStaticAppAuthorizationPolicyNames } from "./app-authorization-facts.ts";

export interface TargetDiagnosticsEvaluation {
  appId?: string;
  authorizationPolicyNames?: readonly string[];
  discoveredPages: readonly CliDiscoveredPage[];
  discoveryErrors?: readonly CliPageDiscoveryError[];
}

export async function resolveTargetDiagnosticsEvaluationsForTarget(
  target: NormalizedMainzTarget,
  cwd = Deno.cwd(),
  selectedAppId?: string,
): Promise<readonly TargetDiagnosticsEvaluation[]> {
  const appDiscovery = await resolveTargetAppDiscoveryForTarget(target, cwd);
  if (!appDiscovery.resolvedAppFile) {
    if (!selectedAppId) {
      return [emptyTargetDiagnosticsEvaluation()];
    }

    throw new Error(
      `Target "${target.name}" does not define an app file for app-aware diagnostics.`,
    );
  }

  if (!appDiscovery.foundAppDefinition) {
    if (!selectedAppId) {
      return [emptyTargetDiagnosticsEvaluation()];
    }

    throw new Error(
      `Target "${target.name}" did not produce any routed app candidates.`,
    );
  }

  const appCandidates = [...(appDiscovery.appCandidates ?? [])].sort(
    compareAppDiscoveryCandidates,
  );
  if (!selectedAppId) {
    return await Promise.all(appCandidates.map(toTargetDiagnosticsEvaluation));
  }

  const selectedCandidates = appCandidates.filter((candidate) =>
    candidate.appId === selectedAppId
  );
  if (selectedCandidates.length > 0) {
    return await Promise.all(
      selectedCandidates.map(toTargetDiagnosticsEvaluation),
    );
  }

  const availableIds = appCandidates
    .flatMap((candidate) => candidate.appId ? [candidate.appId] : [])
    .sort((a, b) => a.localeCompare(b));
  throw new Error(
    availableIds.length > 0
      ? `No app candidates matched "${selectedAppId}" for target "${target.name}". Available apps: ${
        availableIds.join(", ")
      }`
      : `Target "${target.name}" did not produce any selectable app ids.`,
  );
}

async function toTargetDiagnosticsEvaluation(
  candidate: AppDiscoveryCandidate,
): Promise<TargetDiagnosticsEvaluation> {
  return {
    appId: candidate.appId,
    authorizationPolicyNames: await readStaticAppAuthorizationPolicyNames({
      appFile: candidate.appFile,
      appId: candidate.appId,
    }),
    discoveredPages: candidate.discoveryErrors?.length
      ? []
      : [...candidate.discoveredPages],
    discoveryErrors: candidate.discoveryErrors,
  };
}

function emptyTargetDiagnosticsEvaluation(): TargetDiagnosticsEvaluation {
  return {
    discoveredPages: [],
    discoveryErrors: undefined,
  };
}
