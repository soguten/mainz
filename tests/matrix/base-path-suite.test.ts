/// <reference lib="deno.ns" />

import { basePathCases } from "./cases/base-path/base-path-cases.ts";
import { defineScenarioSuite } from "./scenario-harness.ts";

defineScenarioSuite({
  name: "matrix/base-path",
  app: "BasePathApp",
  cases: basePathCases,
});
