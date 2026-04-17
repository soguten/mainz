/// <reference lib="deno.ns" />

import { documentLanguageCases } from "./cases/document-language/document-language-matrix-cases.ts";
import { defineMatrixSuite } from "./harness.ts";

defineMatrixSuite({
    name: "matrix/document-language",
    cases: documentLanguageCases,
});
