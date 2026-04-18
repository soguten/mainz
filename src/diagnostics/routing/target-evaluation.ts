import type { NormalizedMainzTarget } from "../../config/index.ts";
import {
    type AppDiscoveryCandidate,
    type CliDiscoveredPage,
    type CliPageDiscoveryError,
    resolveTargetAppDiscoveryForTarget,
    resolveTargetDiscoveredPages,
} from "../../routing/target-page-discovery.ts";

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
    if (appDiscovery.resolvedAppFile) {
        if (appDiscovery.foundAppDefinition) {
            const appCandidates = [...(appDiscovery.appCandidates ?? [])].sort(
                compareAppDiscoveryCandidates,
            );
            if (selectedAppId) {
                const selectedCandidates = appCandidates.filter((candidate) =>
                    candidate.appId === selectedAppId
                );
                if (selectedCandidates.length === 0) {
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

                return selectedCandidates.map(toTargetDiagnosticsEvaluation);
            }

            return appCandidates.map(toTargetDiagnosticsEvaluation);
        }

        if (selectedAppId) {
            throw new Error(`Target "${target.name}" did not produce any routed app candidates.`);
        }
    } else if (selectedAppId) {
        throw new Error(
            `Target "${target.name}" does not define an app file for app-aware diagnostics.`,
        );
    }

    const fallbackDiscovery = await resolveTargetDiscoveredPages(target.pagesDir, cwd);
    return [{
        discoveredPages: [...(fallbackDiscovery.discoveredPages ?? [])],
        discoveryErrors: fallbackDiscovery.discoveryErrors,
    }];
}

function toTargetDiagnosticsEvaluation(
    candidate: AppDiscoveryCandidate,
): TargetDiagnosticsEvaluation {
    return {
        appId: candidate.appId,
        authorizationPolicyNames: candidate.authorizationPolicyNames,
        discoveredPages: candidate.discoveryErrors?.length ? [] : [...candidate.discoveredPages],
        discoveryErrors: candidate.discoveryErrors,
    };
}

function compareAppDiscoveryCandidates(
    a: Pick<AppDiscoveryCandidate, "appId" | "appFile">,
    b: Pick<AppDiscoveryCandidate, "appId" | "appFile">,
): number {
    if ((a.appId ?? "") !== (b.appId ?? "")) {
        return (a.appId ?? "").localeCompare(b.appId ?? "");
    }

    return a.appFile.localeCompare(b.appFile);
}
