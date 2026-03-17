/// <reference lib="deno.ns" />

import { cliTestCombinations, runCliHelperScript } from "./test-helpers.ts";

for (const combination of cliTestCombinations) {
    Deno.test(
        `e2e/404 matrix: ${combination.mode} + ${combination.navigation} should resolve default and localized notFound pages consistently`,
        async () => {
            await runCliHelperScript(
                "./src/cli/tests/helpers/not-found-matrix-check.ts",
                [combination.mode, combination.navigation],
                `404 matrix check failed for ${combination.mode} + ${combination.navigation}.`,
            );
        },
    );
}
