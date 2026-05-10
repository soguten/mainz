/// <reference lib="deno.ns" />

import { headSeoCase } from "./cases/seo/head-seo.case.ts";
import { defineScenarioSuite } from "./scenario-harness.ts";

defineScenarioSuite({
  name: "matrix/head-seo",
  app: "HeadSeoApp",
  navigations: ["mpa"],
  cases: [headSeoCase],
});
