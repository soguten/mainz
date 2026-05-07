/// <reference lib="deno.ns" />

import { runSingleLocaleRoutingCheck } from "../../checks/single-locale-routing-check.ts";
import { testCombinations } from "../../helpers/types.ts";

for (const combination of testCombinations) {
  Deno.test(
    `e2e/smoke single-locale routing: ${combination.mode} + ${combination.navigation} should keep emitted routes unprefixed for a single-locale target`,
    async () => {
      await runSingleLocaleRoutingCheck(combination);
    },
  );
}
