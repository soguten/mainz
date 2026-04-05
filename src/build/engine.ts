import type { NormalizedMainzConfig, NormalizedMainzTarget } from "../config/index.ts";
import type { NavigationMode, RenderMode } from "../routing/index.ts";
import { runBuildJobs, runSingleBuild } from "./execution.ts";
import {
    type BuildRequestOptions,
    type BuildJob,
    resolveBuildJobs,
} from "./jobs.ts";
import {
    applyBuildProfileOverrides,
    type PublicationMetadata,
    resolvePublicationMetadata,
    resolveTargetBuildProfile,
    type ResolvedBuildProfile,
} from "./profiles.ts";
export { resolveRouteManifestBuildInput } from "./route-manifest-input.ts";

export type BuildEngineOptions = BuildRequestOptions;
export type BuildEngineJob = BuildJob;
export type BuildEngineProfile = ResolvedBuildProfile;
export type BuildEnginePublicationMetadata = PublicationMetadata;
export type BuildEngineRenderMode = RenderMode;
export type BuildEngineNavigationMode = NavigationMode;

export async function resolveEngineBuildJobs(
    config: NormalizedMainzConfig,
    options: BuildEngineOptions,
    cwd = Deno.cwd(),
): Promise<BuildEngineJob[]> {
    return await resolveBuildJobs(config, options, cwd);
}

export async function resolveEngineBuildProfile(
    target: NormalizedMainzTarget,
    requestedProfile: string | undefined,
    cwd = Deno.cwd(),
): Promise<BuildEngineProfile> {
    return await resolveTargetBuildProfile(target, requestedProfile, cwd);
}

export function applyEngineBuildOverrides(
    profile: BuildEngineProfile,
    options: Pick<BuildEngineOptions, "navigation"> | undefined,
): BuildEngineProfile {
    return applyBuildProfileOverrides(profile, options);
}

export async function resolveEnginePublicationMetadata(
    target: NormalizedMainzTarget,
    requestedProfile: string | undefined,
    cwd = Deno.cwd(),
    overrides?: Pick<BuildEngineOptions, "navigation">,
): Promise<BuildEnginePublicationMetadata> {
    return await resolvePublicationMetadata(target, requestedProfile, cwd, overrides);
}

export async function runEngineBuildJobs(
    config: NormalizedMainzConfig,
    jobs: BuildEngineJob[],
    cwd = Deno.cwd(),
): Promise<void> {
    await runBuildJobs(config, jobs, cwd);
}

export async function runEngineBuildJob(
    config: NormalizedMainzConfig,
    job: BuildEngineJob,
    cwd = Deno.cwd(),
): Promise<void> {
    await runSingleBuild(config, job, cwd);
}
