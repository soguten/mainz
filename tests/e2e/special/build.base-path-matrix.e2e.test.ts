/// <reference lib="deno.ns" />

import { cliTestCombinations, runCliHelperScript } from "../../helpers/test-helpers.ts";

for (const combination of cliTestCombinations) {
    Deno.test(
        `e2e/basePath matrix: configured basePath should stay consistent in emitted routes and navigation for ${combination.mode} + ${combination.navigation}`,
        async () => {
            await runCliHelperScript(
                "./tests/checks/base-path-matrix-check.ts",
                [combination.mode, combination.navigation],
                `Base path matrix check failed for ${combination.mode} + ${combination.navigation}.`,
            );
        },
    );
}
