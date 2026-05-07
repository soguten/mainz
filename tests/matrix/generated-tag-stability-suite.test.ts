/// <reference lib="deno.ns" />

import { generatedTagStabilityCase } from "./cases/generated-tags/generated-tag-stability.case.ts";
import { defineMatrixSuite } from "./harness.ts";

defineMatrixSuite({
  name: "matrix/generated-tag-stability",
  cases: [generatedTagStabilityCase],
});
