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
      app: "RoutedApp" | "RootApp";
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
      createCase({ name: "routing", app: "RoutedApp" }),
      createCase({ name: "head", app: "RoutedApp" }),
      createCase({
        name: "profiled",
        app: "RoutedApp",
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
    "RoutedApp",
  );

  assertEquals(groups.length, 1);
  assertEquals(groups[0].recipe.app, "RoutedApp");
});

Deno.test("matrix/scenario-harness: should build stable recipe keys", () => {
  assertEquals(
    getScenarioRecipeKey({
      app: "RoutedApp",
      navigation: "spa",
    }),
    JSON.stringify(["RoutedApp", "", "spa"]),
  );
});

Deno.test("matrix/scenario-harness: should format recipe diagnostics with artifact output", () => {
  const groups = groupScenarioCasesByRecipe(
    [
      scenarioTest({
        name: "routing",
        app: "RoutedApp",
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
            app: "RoutedApp",
            navigation: "spa",
          }),
          ["dist/routed-app/csr", "dist/routed-app/ssg"],
        ],
      ]),
    ),
    [
      "[matrix] navigation: spa",
      "[matrix] recipe: app=RoutedApp profile=none navigation=spa",
      "[matrix] artifact: mode=csr outputDir=dist/routed-app/csr",
      "[matrix] artifact: mode=ssg outputDir=dist/routed-app/ssg",
      "[matrix] cases:",
      "- routing",
    ].join("\n"),
  );
});
