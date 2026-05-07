/// <reference lib="deno.ns" />

import { coreMatrixCases } from "./cases/core/core-matrix-cases.ts";
import { defineMatrixSuite } from "./harness.ts";

defineMatrixSuite({
  name: "matrix/core",
  cases: coreMatrixCases,
});
