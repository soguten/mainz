/// <reference lib="deno.ns" />

import { routedAuthorizationCases } from "./cases/authorization/routed-authorization-matrix-cases.ts";
import { defineMatrixSuite } from "./harness.ts";

defineMatrixSuite({
    name: "matrix/routed-authorization",
    cases: routedAuthorizationCases,
});
