/// <reference lib="deno.ns" />

import { routedDiEntriesCases } from "./cases/di/routed-di-cases.ts";
import { defineScenarioSuite } from "./scenario-harness.ts";

defineScenarioSuite({
  name: "matrix/routed-di-entries",
  app: "RoutedDIEntriesApp",
  cases: routedDiEntriesCases,
});
