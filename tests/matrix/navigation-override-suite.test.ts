/// <reference lib="deno.ns" />

import { navigationOverrideCase } from "./cases/navigation-override/navigation-override.case.ts";
import { defineMatrixSuite } from "./harness.ts";

defineMatrixSuite({
    name: "matrix/navigation-override",
    cases: [navigationOverrideCase],
});
