/// <reference lib="deno.ns" />

import { assertEquals } from "@std/assert";
import {
  formatScenarioRecipeDiagnostics,
  getScenarioRecipeKey,
  groupScenarioCasesByRecipe,
  scenarioTest,
} from "./scenario-harness.ts";

Deno.test("matrix/scenario-harness: should group cases by app, profile, and navigation", () => {
  const createCase = (
    input: {
      name: string;
      app: "LocalizedApp" | "RootApp";
      profile?: string;
      navigation?: readonly ("spa" | "mpa")[];
    },
  ) =>
    scenarioTest({
      ...input,
      run: async () => {},
    });

  const groups = groupScenarioCasesByRecipe(
    [
      createCase({ name: "routing", app: "LocalizedApp" }),
      createCase({ name: "head", app: "LocalizedApp" }),
      createCase({
        name: "profiled",
        app: "LocalizedApp",
        profile: "gh-pages",
      }),
      createCase({
        name: "mpa only",
        app: "RootApp",
        navigation: ["mpa"],
      }),
    ],
    "spa",
  );

  assertEquals(groups.length, 2);
  assertEquals(groups[0].cases.length, 2);
  assertEquals(groups[1].cases.length, 1);
});

Deno.test("matrix/scenario-harness: should inherit app from the suite when a case omits it", () => {
  const groups = groupScenarioCasesByRecipe(
    [
      scenarioTest({
        name: "routing",
        run: async () => {},
      }),
    ],
    "spa",
    "LocalizedApp",
  );

  assertEquals(groups.length, 1);
  assertEquals(groups[0].recipe.app, "LocalizedApp");
});

Deno.test("matrix/scenario-harness: should build stable recipe keys", () => {
  assertEquals(
    getScenarioRecipeKey({
      app: "LocalizedApp",
      navigation: "spa",
    }),
    JSON.stringify(["LocalizedApp", "", "spa"]),
  );
});

Deno.test("matrix/scenario-harness: should format recipe diagnostics with artifact output", () => {
  const groups = groupScenarioCasesByRecipe(
    [
      scenarioTest({
        name: "routing",
        app: "LocalizedApp",
        run: async () => {},
      }),
    ],
    "spa",
  );

  assertEquals(
    formatScenarioRecipeDiagnostics(
      "spa",
      groups,
      new Map([
        [
          getScenarioRecipeKey({
            app: "LocalizedApp",
            navigation: "spa",
          }),
          ["dist/localized-app"],
        ],
      ]),
    ),
    [
      "[matrix] navigation: spa",
      "[matrix] recipe: app=LocalizedApp profile=none navigation=spa",
      "[matrix] artifact: mode=localized-app outputDir=dist/localized-app",
      "[matrix] cases:",
      "- routing",
    ].join("\n"),
  );
});
