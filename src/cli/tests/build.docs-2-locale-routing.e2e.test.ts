/// <reference lib="deno.ns" />

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const decoder = new TextDecoder();
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const combinations = [
    { mode: "ssg", navigation: "spa" },
    { mode: "ssg", navigation: "mpa" },
    { mode: "ssg", navigation: "enhanced-mpa" },
    { mode: "csr", navigation: "spa" },
    { mode: "csr", navigation: "mpa" },
    { mode: "csr", navigation: "enhanced-mpa" },
] as const;

for (const combination of combinations) {
    Deno.test(
        `e2e/docs-2 locale routing: ${combination.mode} + ${combination.navigation} should keep docs routes locale-prefixed`,
        async () => {
            const command = new Deno.Command("deno", {
                args: [
                    "run",
                    "-A",
                    "./src/cli/tests/helpers/docs-2-locale-routing-check.ts",
                    combination.mode,
                    combination.navigation,
                ],
                cwd: repoRoot,
                stdout: "piped",
                stderr: "piped",
            });

            const result = await command.output();
            if (result.success) {
                return;
            }

            const stdout = decoder.decode(result.stdout);
            const stderr = decoder.decode(result.stderr);
            throw new Error(
                `Docs-2 locale routing check failed for ${combination.mode} + ${combination.navigation}.\nstdout:\n${stdout}\nstderr:\n${stderr}`,
            );
        },
    );
}
