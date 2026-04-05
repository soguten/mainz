/// <reference lib="deno.ns" />

import { basePathCases } from "./cases/base-path/base-path-matrix-cases.ts";
import { defineMatrixSuite } from "./harness.ts";

defineMatrixSuite({
    name: "matrix/base-path",
    cases: basePathCases,
});
