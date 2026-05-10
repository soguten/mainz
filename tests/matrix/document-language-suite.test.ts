/// <reference lib="deno.ns" />

import { documentLanguageCases } from "./cases/document-language/document-language-cases.ts";
import { defineScenarioSuite } from "./scenario-harness.ts";

defineScenarioSuite({
  name: "matrix/document-language",
  app: "DocumentLanguageRoutedApp",
  cases: documentLanguageCases,
});
