/**
 * JSR entrypoint for the Mainz Deno CLI/tooling package.
 *
 * @module
 */

import { main } from "./src/cli/mainz.ts";
import { denoToolingRuntime as internalDenoToolingRuntime } from "./src/tooling/runtime/deno.ts";
import type { MainzToolingRuntime } from "./src/tooling/runtime/types.ts";

export { main } from "./src/cli/mainz.ts";
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
    const exitCode = await main(Deno.args, { hostRuntime: "deno" });
    if (exitCode !== 0) {
        Deno.exit(exitCode);
    }
}
