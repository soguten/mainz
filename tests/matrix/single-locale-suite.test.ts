/// <reference lib="deno.ns" />

import { singleLocaleCases } from "./cases/single-locale/single-locale-cases.ts";
import { defineScenarioSuite } from "./scenario-harness.ts";

defineScenarioSuite({
  name: "matrix/single-locale",
  app: "SingleLocaleRoutedApp",
  cases: singleLocaleCases,
});
