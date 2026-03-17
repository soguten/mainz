/// <reference lib="deno.ns" />

import { cliTestCombinations, runCliHelperScript } from "./test-helpers.ts";

for (const combination of cliTestCombinations) {
    Deno.test(
        `e2e/navigation matrix: ${combination.mode} + ${combination.navigation} should honor the expected internal link behavior`,
        async () => {
            await runCliHelperScript(
                "./src/cli/tests/helpers/navigation-matrix-check.ts",
                [combination.mode, combination.navigation],
                `Navigation matrix check failed for ${combination.mode} + ${combination.navigation}.`,
            );
        },
    );
}
