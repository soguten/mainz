/**
 * JSR entrypoint for Mainz Deno tooling.
 *
 * @module
 */

import { main } from "./src/cli/mainz.ts";
import { denoToolingRuntime as internalDenoToolingRuntime } from "./src/tooling/runtime/deno.ts";
import type { MainzToolingRuntime } from "./src/tooling/runtime/types.ts";

export { main } from "./src/cli/mainz.ts";
export { createAppScaffold, createProjectEmptyScaffold } from "./src/cli/scaffolds/index.ts";
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
 * Shared Deno tooling runtime instance exposed by the published package.
 */
export const denoToolingRuntime: MainzToolingRuntime = internalDenoToolingRuntime;

if (import.meta.main) {
    await main(Deno.args);
}
