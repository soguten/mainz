/// <reference lib="deno.ns" />

import { cliTestCombinations, runCliHelperScript } from "./test-helpers.ts";

for (const combination of cliTestCombinations) {
    Deno.test(
        `e2e/i18n matrix: ${combination.mode} + ${combination.navigation} should keep locale redirects and localized routes consistent`,
        async () => {
            await runCliHelperScript(
                "./src/cli/tests/helpers/i18n-matrix-check.ts",
                [combination.mode, combination.navigation],
                `i18n matrix check failed for ${combination.mode} + ${combination.navigation}.`,
            );
        },
    );
}
