/// <reference lib="deno.ns" />

import { cliTestCombinations, runCliHelperScript } from "./test-helpers.ts";

for (const combination of cliTestCombinations) {
    Deno.test(
        `e2e/docs routing: ${combination.mode} + ${combination.navigation} should keep docs routes unprefixed for a single-locale target`,
        async () => {
            await runCliHelperScript(
                "./src/cli/tests/helpers/docs-locale-routing-check.ts",
                [combination.mode, combination.navigation],
                `Docs routing check failed for ${combination.mode} + ${combination.navigation}.`,
            );
        },
    );
}
