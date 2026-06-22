/**
 * Bootstrap/global CLI entrypoint exposed by the published Mainz package.
 *
 * This surface keeps full CLI scope available so bootstrap wrappers such as
 * `create-mainz` can delegate project creation to the canonical Mainz tooling
 * package instead of re-implementing scaffold behavior.
 *
 * @module
 */

import { main as runCli } from "../cli/mainz.ts";

export type { MainzToolingRuntime } from "../tooling/runtime/types.ts";

export async function main(
  args: string[],
  options: { hostRuntime?: "deno" | "node" } = {},
): Promise<number> {
  return await runCli(args, {
    hostRuntime: options.hostRuntime,
    commandScope: "all",
  });
}

if (
  import.meta.main &&
  typeof globalThis.Deno !== "undefined" &&
  typeof globalThis.Deno.version?.deno === "string"
) {
  const exitCode = await main(Deno.args, { hostRuntime: "deno" });
  if (exitCode !== 0) {
    Deno.exit(exitCode);
  }
}
