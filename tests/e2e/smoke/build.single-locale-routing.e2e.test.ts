/// <reference lib="deno.ns" />

import { runSingleLocaleRoutingCheck } from "../../checks/single-locale-routing-check.ts";
import type { TestNavigationMode } from "../../helpers/types.ts";

const singleLocaleRoutingNavigations = [
  "spa",
  "mpa",
] as const satisfies readonly TestNavigationMode[];

Deno.test(
  "e2e/single-locale routing: should keep emitted routes unprefixed for a single-locale target",
  async (t) => {
    for (const navigation of singleLocaleRoutingNavigations) {
      await t.step(navigation, async () => {
        await runSingleLocaleRoutingCheck({ navigation });
      });
    }
  },
);
