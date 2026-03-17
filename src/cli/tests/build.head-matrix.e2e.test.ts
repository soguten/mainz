/// <reference lib="deno.ns" />

import { cliTestCombinations, runCliHelperScript } from "./test-helpers.ts";

for (const combination of cliTestCombinations) {
    Deno.test(
        `e2e/head matrix: ${combination.mode} + ${combination.navigation} should keep a single managed canonical and hreflang set`,
        async () => {
            await runCliHelperScript(
                "./src/cli/tests/helpers/head-matrix-check.ts",
                [combination.mode, combination.navigation],
                `Head matrix check failed for ${combination.mode} + ${combination.navigation}.`,
            );
        },
    );
}
