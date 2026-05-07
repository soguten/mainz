/// <reference lib="deno.ns" />

import { routedDiEntriesCases } from "./cases/di/routed-di-matrix-cases.ts";
import { defineMatrixSuite } from "./harness.ts";

defineMatrixSuite({
  name: "matrix/routed-di-entries",
  cases: routedDiEntriesCases,
});
