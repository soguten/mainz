/// <reference lib="deno.ns" />

import { cliTestCombinations, runCliHelperScript } from "./test-helpers.ts";

for (const combination of cliTestCombinations) {
    Deno.test(
        `e2e/routing matrix: ${combination.mode} + ${combination.navigation} should resolve home and notFound routes consistently`,
        async () => {
            await runCliHelperScript(
                "./src/cli/tests/helpers/routing-matrix-check.ts",
                [combination.mode, combination.navigation],
                `Routing matrix check failed for ${combination.mode} + ${combination.navigation}.`,
            );
        },
    );
}
