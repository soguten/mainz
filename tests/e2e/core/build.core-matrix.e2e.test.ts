/// <reference lib="deno.ns" />

import {
    buildCoreContractsForCombination,
    cliTestCombinations,
} from "../../helpers/test-helpers.ts";
import { runRoutingMatrixCheck } from "../../checks/routing-matrix-check.ts";
import { runNotFoundMatrixCheck } from "../../checks/not-found-matrix-check.ts";
import { runI18nMatrixCheck } from "../../checks/i18n-matrix-check.ts";
import { runNavigationMatrixCheck } from "../../checks/navigation-matrix-check.ts";
import { runHydrationMatrixCheck } from "../../checks/hydration-matrix-check.ts";
import { runHeadMatrixCheck } from "../../checks/head-matrix-check.ts";

for (const combination of cliTestCombinations) {
    Deno.test(
        `e2e/core matrix: ${combination.mode} + ${combination.navigation} should preserve shared framework contracts`,
        async (t) => {
            const context = await buildCoreContractsForCombination(combination);

            try {
                await t.step("routing", async () => {
                    await runRoutingMatrixCheck({ ...combination, context });
                });

                await t.step("notFound", async () => {
                    await runNotFoundMatrixCheck({ ...combination, context });
                });

                await t.step("i18n", async () => {
                    await runI18nMatrixCheck({ ...combination, context });
                });

                await t.step("navigation", async () => {
                    await runNavigationMatrixCheck({ ...combination, context });
                });

                await t.step("hydration", async () => {
                    await runHydrationMatrixCheck({ ...combination, context });
                });

                await t.step("head", async () => {
                    await runHeadMatrixCheck({ ...combination, context });
                });
            } finally {
                await context.cleanup?.();
            }
        },
    );
}
