/**
 * JSR entrypoint for the Mainz Node CLI/tooling package.
 *
 * @module
 */

import process from "node:process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { main } from "./src/cli/mainz.ts";
export { createAppScaffold, createProjectEmptyScaffold } from "./src/cli/scaffolds/index.ts";
import { nodeToolingRuntime as internalNodeToolingRuntime } from "./src/tooling/runtime/node.ts";
import type { MainzToolingRuntime } from "./src/tooling/runtime/types.ts";
export { main } from "./src/cli/mainz.ts";
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

if (isMainModule()) {
    const exitCode = await main(process.argv.slice(2), { hostRuntime: "node" });
    if (exitCode !== 0) {
        process.exit(exitCode);
    }
}

function isMainModule(): boolean {
    const entryArg = process.argv[1];
    if (!entryArg) {
        return false;
    }

    return resolve(entryArg) === resolve(fileURLToPath(import.meta.url));
}
