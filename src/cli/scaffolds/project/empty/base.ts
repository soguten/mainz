/**
 * Tooling platforms supported by the empty project scaffold.
 */
export type EmptyProjectPlatform = "deno" | "node";

/**
 * Renders the shared Mainz config for an empty project scaffold.
 */
export function renderEmptyProjectConfig(platform: EmptyProjectPlatform): string {
    return [
        'import { defineMainzConfig } from "mainz/config";',
        "",
        "export default defineMainzConfig({",
        `    platform: ${JSON.stringify(platform)},`,
        "    targets: [",
        "    ],",
        "});",
        "",
    ].join("\n");
}
