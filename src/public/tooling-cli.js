export * from "./tooling-cli.ts";

import { main } from "./tooling-cli.ts";

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
