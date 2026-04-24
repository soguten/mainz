/**
 * JSR entrypoint for Mainz Deno tooling.
 *
 * @module
 */

import { main } from "./src/cli/mainz.ts";
import { denoToolingPlatform as internalDenoToolingPlatform } from "./src/tooling/platform/deno.ts";
import type { MainzToolingPlatform } from "./src/tooling/platform/types.ts";

export { main } from "./src/cli/mainz.ts";
export { createAppScaffold, createProjectEmptyScaffold } from "./src/cli/scaffolds/index.ts";
export type {
    AppScaffold,
    AppScaffoldNavigation,
    AppScaffoldPlatform,
    AppScaffoldTarget,
    AppScaffoldType,
    CreateAppScaffoldOptions,
    CreateProjectEmptyScaffoldOptions,
    EmptyProjectPlatform,
    ProjectEmptyScaffold,
} from "./src/cli/scaffolds/index.ts";
export type {
    MainzToolingPlatform,
    ToolingCommand,
    ToolingCommandResult,
    ToolingCommandStdio,
    ToolingDirEntry,
    ToolingFileStat,
    ToolingPlatformName,
    ToolingViteCommandOptions,
} from "./src/tooling/platform/types.ts";

/**
 * Shared Deno tooling platform instance exposed by the published package.
 */
export const denoToolingPlatform: MainzToolingPlatform = internalDenoToolingPlatform;

if (import.meta.main) {
    await main(Deno.args);
}
