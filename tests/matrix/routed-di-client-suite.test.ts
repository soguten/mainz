/// <reference lib="deno.ns" />

import { routedDiClientCases } from "./cases/di/routed-di-cases.ts";
import { defineScenarioSuite } from "./scenario-harness.ts";

defineScenarioSuite({
  name: "matrix/routed-di-client",
  app: "RoutedDIClientApp",
  navigations: ["spa"],
  cases: routedDiClientCases,
});
