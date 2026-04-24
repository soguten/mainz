/**
 * JSR entrypoint for Mainz Node tooling primitives.
 *
 * @module
 */

export { createAppScaffold, createProjectEmptyScaffold } from "./src/cli/scaffolds/index.ts";
import { nodeToolingRuntime as internalNodeToolingRuntime } from "./src/tooling/runtime/node.ts";
import type { MainzToolingRuntime } from "./src/tooling/runtime/types.ts";
export type {
    AppScaffold,
    AppScaffoldNavigation,
    AppScaffoldRuntime,
    AppScaffoldTarget,
    AppScaffoldType,
    CreateAppScaffoldOptions,
    CreateProjectEmptyScaffoldOptions,
    EmptyProjectRuntime,
    ProjectEmptyScaffold,
} from "./src/cli/scaffolds/index.ts";
export type {
    MainzToolingRuntime,
    ToolingCommand,
    ToolingCommandResult,
    ToolingCommandStdio,
    ToolingDirEntry,
    ToolingFileStat,
    ToolingRuntimeName,
    ToolingViteCommandOptions,
} from "./src/tooling/runtime/types.ts";

/**
 * Shared Node tooling runtime instance exposed by the published package.
 */
export const nodeToolingRuntime: MainzToolingRuntime = internalNodeToolingRuntime;
