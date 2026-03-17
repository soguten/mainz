/// <reference lib="deno.ns" />

import { cliTestCombinations, runCliHelperScript } from "./test-helpers.ts";

for (const combination of cliTestCombinations) {
    Deno.test(
        `e2e/basePath matrix: gh-pages subpath should stay consistent for ${combination.mode} + ${combination.navigation}`,
        async () => {
            await runCliHelperScript(
                "./src/cli/tests/helpers/base-path-matrix-check.ts",
                [combination.mode, combination.navigation],
                `Base path matrix check failed for ${combination.mode} + ${combination.navigation}.`,
            );
        },
    );
}
