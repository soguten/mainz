/**
 * Tooling runtimes supported by the empty project scaffold.
 */
export type EmptyProjectRuntime = "deno";

/**
 * Renders the shared Mainz config for an empty project scaffold.
 */
export function renderEmptyProjectConfig(): string {
    return [
        'import { defineMainzConfig } from "mainz/config";',
        "",
        "export default defineMainzConfig({",
        '    runtime: "deno",',
        "    targets: [",
        "    ],",
        "});",
        "",
    ].join("\n");
}
