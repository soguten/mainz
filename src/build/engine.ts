import type { NormalizedMainzConfig, NormalizedMainzTarget } from "../config/index.ts";
import type { NavigationMode, RenderMode } from "../routing/index.ts";
import { denoToolingPlatform } from "../tooling/platform/index.ts";
import type { MainzToolingPlatform } from "../tooling/platform/index.ts";
import { runBuildJobs, runDevServer, runSingleBuild } from "./execution.ts";
import { type BuildJob, type BuildRequestOptions, resolveBuildJobs } from "./jobs.ts";
import {
    type PublicationMetadata,
    type ResolvedBuildProfile,
    resolvePublicationMetadata,
    resolveTargetBuildProfile,
} from "./profiles.ts";
export { resolveRouteManifestBuildInput } from "./route-manifest-input.ts";

export type BuildEngineOptions = BuildRequestOptions;
export type BuildEngineJob = BuildJob;
export type BuildEngineProfile = ResolvedBuildProfile;
export type BuildEnginePublicationMetadata = PublicationMetadata;
export type BuildEngineRenderMode = RenderMode;
export type BuildEngineNavigationMode = NavigationMode;
export type DevServerHostOption = string | true;

export async function resolveEngineBuildJobs(
    config: NormalizedMainzConfig,
    options: BuildEngineOptions,
    cwd = denoToolingPlatform.cwd(),
    platform: MainzToolingPlatform = denoToolingPlatform,
): Promise<BuildEngineJob[]> {
    return await resolveBuildJobs(config, options, cwd, platform);
}

export async function resolveEngineBuildProfile(
    target: NormalizedMainzTarget,
    requestedProfile: string | undefined,
    cwd = denoToolingPlatform.cwd(),
    platform: MainzToolingPlatform = denoToolingPlatform,
): Promise<BuildEngineProfile> {
    return await resolveTargetBuildProfile(target, requestedProfile, cwd, platform);
}

export async function resolveEnginePublicationMetadata(
    target: NormalizedMainzTarget,
    requestedProfile: string | undefined,
    cwd = denoToolingPlatform.cwd(),
    platform: MainzToolingPlatform = denoToolingPlatform,
): Promise<BuildEnginePublicationMetadata> {
    return await resolvePublicationMetadata(target, requestedProfile, cwd, platform);
}

export async function runEngineBuildJobs(
    config: NormalizedMainzConfig,
    jobs: BuildEngineJob[],
    cwd = denoToolingPlatform.cwd(),
    platform: MainzToolingPlatform = denoToolingPlatform,
): Promise<void> {
    await runBuildJobs(config, jobs, cwd, platform);
}

export async function runEngineBuildJob(
    config: NormalizedMainzConfig,
    job: BuildEngineJob,
    cwd = denoToolingPlatform.cwd(),
    platform: MainzToolingPlatform = denoToolingPlatform,
): Promise<void> {
    await runSingleBuild(config, job, cwd, platform);
}

export async function runEngineDevServer(
    config: NormalizedMainzConfig,
    target: NormalizedMainzTarget,
    profile: BuildEngineProfile,
    options: {
        host?: DevServerHostOption;
        port?: number;
    } = {},
    cwd = denoToolingPlatform.cwd(),
    platform: MainzToolingPlatform = denoToolingPlatform,
): Promise<void> {
    await runDevServer({
        config,
        targetName: target.name,
        profile,
        host: options.host,
        port: options.port,
        cwd,
        platform,
    });
}
