import type { NormalizedMainzConfig, NormalizedMainzTarget } from "../config/index.ts";
import type { RenderMode } from "../routing/index.ts";
import { resolveTargetDiscoveredPagesForTarget } from "../routing/target-page-discovery.ts";
import { denoToolingRuntime } from "../tooling/runtime/index.ts";
import type { MainzToolingRuntime } from "../tooling/runtime/index.ts";
import type { ResolvedBuildProfile } from "./profiles.ts";

export interface BuildRequestOptions {
    target?: string;
    profile?: string;
    configPath?: string;
}

export interface ForcedBuildRequestOptions extends BuildRequestOptions {
    mode?: string;
}

export interface BuildJob {
    target: NormalizedMainzTarget;
    mode: RenderMode;
    profile: ResolvedBuildProfile;
}

const DEFAULT_BUILD_PROFILE_NAME = "production";
const BUILD_RECIPE_RENDER_MODES: readonly RenderMode[] = ["csr", "ssg"];

export async function resolveBuildJobs(
    config: NormalizedMainzConfig,
    options: BuildRequestOptions,
    cwd = denoToolingRuntime.cwd(),
    runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<BuildJob[]> {
    return await resolveProductionBuildJobsInternal(config, options, cwd, runtime);
}

export async function resolveForcedBuildJobs(
    config: NormalizedMainzConfig,
    options: ForcedBuildRequestOptions,
    cwd = denoToolingRuntime.cwd(),
): Promise<BuildJob[]> {
    const targetSelection = options.target?.trim();
    const modeSelection = options.mode?.trim();

    const targets = targetSelection && targetSelection !== "all"
        ? config.targets.filter((target) => target.name === targetSelection)
        : config.targets;

    if (targets.length === 0) {
        throw new Error(
            `No targets matched "${targetSelection}". Available targets: ${
                config.targets.map((target) => target.name).join(", ")
            }`,
        );
    }

    const modes = modeSelection && modeSelection !== "all"
        ? BUILD_RECIPE_RENDER_MODES.filter((mode) => mode === modeSelection)
        : BUILD_RECIPE_RENDER_MODES;

    if (modes.length === 0) {
        throw new Error(
            `No render modes matched "${modeSelection}". Available modes: ${
                BUILD_RECIPE_RENDER_MODES.join(", ")
            }`,
        );
    }

    const jobs: BuildJob[] = [];
    const profile: ResolvedBuildProfile = {
        name: options.profile?.trim() || DEFAULT_BUILD_PROFILE_NAME,
        basePath: "/",
    };

    for (const target of targets) {
        for (const mode of modes) {
            jobs.push({ target, mode, profile });
        }
    }

    return jobs;
}

async function resolveProductionBuildJobsInternal(
    config: NormalizedMainzConfig,
    options: BuildRequestOptions,
    cwd: string,
    runtime: MainzToolingRuntime,
): Promise<BuildJob[]> {
    const targetSelection = options.target?.trim();
    const jobs = await resolveForcedBuildJobs(config, options, cwd);

    const filteredJobs: BuildJob[] = [];
    for (const job of jobs) {
        if (!await targetSupportsRenderMode(job.target, job.mode, cwd, runtime)) {
            continue;
        }

        filteredJobs.push(job);
    }

    if (filteredJobs.length === 0 && targetSelection) {
        const selectedTarget = config.targets.find((target) => target.name === targetSelection);
        if (
            selectedTarget &&
            jobs.length > 0 &&
            !await targetSupportsRenderMode(selectedTarget, jobs[0].mode, cwd, runtime)
        ) {
            throw new Error(
                `Target "${selectedTarget.name}" has no pages/routes and only supports csr app builds.`,
            );
        }
    }

    return filteredJobs;
}

async function targetSupportsRenderMode(
    target: NormalizedMainzTarget,
    mode: RenderMode,
    cwd: string,
    runtime: MainzToolingRuntime,
): Promise<boolean> {
    const supportedModes = await resolveTargetSupportedRenderModes(target, cwd, runtime);
    return supportedModes.has(mode);
}

async function resolveTargetSupportedRenderModes(
    target: NormalizedMainzTarget,
    cwd: string,
    runtime: MainzToolingRuntime,
): Promise<ReadonlySet<RenderMode>> {
    const discovery = await resolveTargetDiscoveredPagesForTarget(target, cwd, runtime);
    const hasAnyRouteInput = Boolean(discovery.discoveredPages?.length);

    if (discovery.discoveryErrors?.length) {
        throw new Error(
            discovery.discoveryErrors.map((entry) => `${entry.file}: ${entry.message}`).join("\n"),
        );
    }

    if (!hasAnyRouteInput) {
        return new Set<RenderMode>(["csr"]);
    }

    const discoveredModes = new Set<RenderMode>(
        discovery.discoveredPages?.map((page) => page.mode) ?? [],
    );

    return discoveredModes.size > 0 ? discoveredModes : new Set<RenderMode>(["csr"]);
}
