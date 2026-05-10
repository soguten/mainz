/// <reference lib="deno.ns" />

import { generatedTagStabilityCase } from "./cases/generated-tags/generated-tag-stability.case.ts";
import { defineScenarioSuite } from "./scenario-harness.ts";

defineScenarioSuite({
  name: "matrix/generated-tag-stability",
  app: "GeneratedTagStabilityApp",
  navigations: ["mpa"],
  cases: [generatedTagStabilityCase],
});
