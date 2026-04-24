/**
 * JSR entrypoint for Mainz Node tooling primitives.
 *
 * @module
 */

export { createAppScaffold, createProjectEmptyScaffold } from "./src/cli/scaffolds/index.ts";
import { nodeToolingPlatform as internalNodeToolingPlatform } from "./src/tooling/platform/node.ts";
import type { MainzToolingPlatform } from "./src/tooling/platform/types.ts";
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
 * Shared Node tooling platform instance exposed by the published package.
 */
export const nodeToolingPlatform: MainzToolingPlatform = internalNodeToolingPlatform;
