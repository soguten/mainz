/// <reference lib="deno.ns" />

import { unlocalizedRoutingCases } from "./cases/unlocalized-routing/unlocalized-routing-cases.ts";
import { defineScenarioSuite } from "./scenario-harness.ts";

defineScenarioSuite({
  name: "matrix/unlocalized-routing",
  app: "UnlocalizedRoutedApp",
  cases: unlocalizedRoutingCases,
});
