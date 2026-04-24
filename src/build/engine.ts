import type { NormalizedMainzConfig, NormalizedMainzTarget } from "../config/index.ts";
import type { NavigationMode, RenderMode } from "../routing/index.ts";
import { denoToolingRuntime } from "../tooling/runtime/index.ts";
import type { MainzToolingRuntime } from "../tooling/runtime/index.ts";
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
    cwd = denoToolingRuntime.cwd(),
    runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<BuildEngineJob[]> {
    return await resolveBuildJobs(config, options, cwd, runtime);
}

export async function resolveEngineBuildProfile(
    target: NormalizedMainzTarget,
    requestedProfile: string | undefined,
    cwd = denoToolingRuntime.cwd(),
    runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<BuildEngineProfile> {
    return await resolveTargetBuildProfile(target, requestedProfile, cwd, runtime);
}

export async function resolveEnginePublicationMetadata(
    target: NormalizedMainzTarget,
    requestedProfile: string | undefined,
    cwd = denoToolingRuntime.cwd(),
    runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<BuildEnginePublicationMetadata> {
    return await resolvePublicationMetadata(target, requestedProfile, cwd, runtime);
}

export async function runEngineBuildJobs(
    config: NormalizedMainzConfig,
    jobs: BuildEngineJob[],
    cwd = denoToolingRuntime.cwd(),
    runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<void> {
    await runBuildJobs(config, jobs, cwd, runtime);
}

export async function runEngineBuildJob(
    config: NormalizedMainzConfig,
    job: BuildEngineJob,
    cwd = denoToolingRuntime.cwd(),
    runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<void> {
    await runSingleBuild(config, job, cwd, runtime);
}

export async function runEngineDevServer(
    config: NormalizedMainzConfig,
    target: NormalizedMainzTarget,
    profile: BuildEngineProfile,
    options: {
        host?: DevServerHostOption;
        port?: number;
    } = {},
    cwd = denoToolingRuntime.cwd(),
    runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<void> {
    await runDevServer({
        config,
        targetName: target.name,
        profile,
        host: options.host,
        port: options.port,
        cwd,
        runtime,
    });
}
