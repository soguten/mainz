/// <reference lib="deno.ns" />

import { cliTestCombinations, runCliHelperScript } from "./test-helpers.ts";

for (const combination of cliTestCombinations) {
    Deno.test(
        `e2e/hydration matrix: ${combination.mode} + ${combination.navigation} should boot /pt/ without duplicating the tutorial root`,
        async () => {
            await runCliHelperScript(
                "./src/cli/tests/helpers/hydration-matrix-check.ts",
                [combination.mode, combination.navigation],
                `Hydration matrix check failed for ${combination.mode} + ${combination.navigation}.`,
            );
        },
    );
}
