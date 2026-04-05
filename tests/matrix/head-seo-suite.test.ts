/// <reference lib="deno.ns" />

import { headSeoCase } from "./cases/seo/head-seo.case.ts";
import { defineMatrixSuite } from "./harness.ts";

defineMatrixSuite({
    name: "matrix/head-seo",
    cases: [headSeoCase],
});
