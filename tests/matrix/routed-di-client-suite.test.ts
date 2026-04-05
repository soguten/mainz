/// <reference lib="deno.ns" />

import { routedDiClientCases } from "./cases/di/routed-di-matrix-cases.ts";
import { defineMatrixSuite } from "./harness.ts";

defineMatrixSuite({
    name: "matrix/routed-di-client",
    cases: routedDiClientCases,
});
