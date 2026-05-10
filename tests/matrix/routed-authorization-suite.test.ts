/// <reference lib="deno.ns" />

import { routedAuthorizationCases } from "./cases/authorization/routed-authorization-cases.ts";
import { defineScenarioSuite } from "./scenario-harness.ts";

defineScenarioSuite({
  name: "matrix/routed-authorization",
  app: "RoutedAuthorizationApp",
  navigations: ["spa"],
  cases: routedAuthorizationCases,
});
