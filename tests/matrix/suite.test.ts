/// <reference lib="deno.ns" />

import { coreScenarioCases } from "./cases/core/core-scenario-cases.ts";
import { defineScenarioSuite } from "./scenario-harness.ts";

defineScenarioSuite({
  name: "matrix/core",
  cases: coreScenarioCases,
});
