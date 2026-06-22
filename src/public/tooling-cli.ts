/**
 * Project-local CLI entrypoint exposed by the published Mainz package.
 *
 * This surface intentionally limits execution to project-scoped commands so
 * generated launchers do not become a second bootstrap/global CLI.
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
    commandScope: "project",
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
