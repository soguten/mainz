/**
 * Tooling runtimes supported by the empty project scaffold.
 */
export type EmptyProjectRuntime = "deno" | "node";

/**
 * Renders the shared Mainz config for an empty project scaffold.
 */
export function renderEmptyProjectConfig(runtime: EmptyProjectRuntime): string {
    return [
        'import { defineMainzConfig } from "mainz/config";',
        "",
        "export default defineMainzConfig({",
        `    runtime: ${JSON.stringify(runtime)},`,
        "    targets: [",
        "    ],",
        "});",
        "",
    ].join("\n");
}
