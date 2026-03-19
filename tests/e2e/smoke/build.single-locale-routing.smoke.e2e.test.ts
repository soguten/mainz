/// <reference lib="deno.ns" />

import { cliTestCombinations, runCliHelperScript } from "../../helpers/test-helpers.ts";

for (const combination of cliTestCombinations) {
    Deno.test(
        `e2e/smoke single-locale routing: ${combination.mode} + ${combination.navigation} should keep emitted routes unprefixed for a single-locale target`,
        async () => {
            await runCliHelperScript(
                "./tests/checks/single-locale-routing-check.ts",
                [combination.mode, combination.navigation],
                `Single-locale routing check failed for ${combination.mode} + ${combination.navigation}.`,
            );
        },
    );
}
