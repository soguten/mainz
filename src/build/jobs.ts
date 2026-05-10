import type {
  NormalizedMainzConfig,
} from "../config/index.ts";
import { resolveTargetDiscoveredPagesForTarget } from "../routing/target-page-discovery.ts";
import { denoToolingRuntime } from "../tooling/runtime/index.ts";
import type { MainzToolingRuntime } from "../tooling/runtime/index.ts";
import type { ResolvedBuildProfile } from "./profiles.ts";

export interface BuildRequestOptions {
  target?: string;
  profile?: string;
  configPath?: string;
}

export interface ForcedBuildRequestOptions extends BuildRequestOptions {}

export interface BuildJob {
  target: NormalizedMainzConfig["targets"][number];
  profile: ResolvedBuildProfile;
}

const DEFAULT_BUILD_PROFILE_NAME = "production";

export async function resolveBuildJobs(
  config: NormalizedMainzConfig,
  options: BuildRequestOptions,
  cwd: string = denoToolingRuntime.cwd(),
  runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<BuildJob[]> {
  const jobs = await resolveForcedBuildJobs(config, options, cwd, runtime);

  for (const job of jobs) {
    const discovery = await resolveTargetDiscoveredPagesForTarget(
      job.target,
      cwd,
      runtime,
    );
    if (discovery.discoveryErrors?.length) {
      throw new Error(
        discovery.discoveryErrors.map((entry) =>
          `${entry.file}: ${entry.message}`
        ).join("\n"),
      );
    }
  }

  return jobs;
}

export async function resolveForcedBuildJobs(
  config: NormalizedMainzConfig,
  options: ForcedBuildRequestOptions,
  cwd: string = denoToolingRuntime.cwd(),
  _runtime: MainzToolingRuntime = denoToolingRuntime,
): Promise<BuildJob[]> {
  const targetSelection = options.target?.trim();

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

  const jobs: BuildJob[] = [];
  const profile: ResolvedBuildProfile = {
    name: options.profile?.trim() || DEFAULT_BUILD_PROFILE_NAME,
    basePath: "/",
  };

  for (const target of targets) {
    jobs.push({ target, profile });
  }

  return jobs;
}
