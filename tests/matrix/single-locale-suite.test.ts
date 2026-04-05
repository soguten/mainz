/// <reference lib="deno.ns" />

import { singleLocaleCases } from "./cases/single-locale/single-locale-matrix-cases.ts";
import { defineMatrixSuite } from "./harness.ts";

defineMatrixSuite({
    name: "matrix/single-locale",
    cases: singleLocaleCases,
});
