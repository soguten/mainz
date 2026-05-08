/// <reference lib="deno.ns" />

import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import {
  expandMatrixExercise,
  formatMatrixRecipeDiagnostics,
  getMatrixRecipeKey,
  groupMatrixCasesByRecipe,
  type MatrixCase,
  matrixCaseExercisesCombo,
  matrixTest,
  runMatrixCombo,
} from "./harness.ts";
import type {
  MatrixArtifact,
  MatrixBuildRecipe,
  MatrixFixture,
} from "./harness.ts";
import type { FixtureId } from "./fixtures.ts";

function createInlineStepRunner(): Pick<Deno.TestContext, "step"> {
  const step = (async (...args: unknown[]): Promise<boolean> => {
    const first = args[0];
    const second = args[1];
    const stepDefinition = first as {
      fn?: (t: Deno.TestContext) => Promise<void> | void;
    };
    const run = typeof first === "function"
      ? first
      : typeof first === "string"
      ? second
      : stepDefinition.fn;

    if (typeof run !== "function") {
      throw new Error("Expected test step function.");
    }

    await run({ step } as unknown as Deno.TestContext);
    return true;
  }) as Deno.TestContext["step"];

  return {
    step,
  };
}

function createInlineFixture(): MatrixFixture {
  return {
    id: "InlineFixture",
    readHtml: async () => "",
    readJson: async <T>() => ({} as T),
    loadDocument: async () => ({ html: "", htmlPath: "", outputDir: "" }),
    resolveHtmlPath: () => "",
    preview: async () => ({ html: "", htmlPath: "", outputDir: "" }),
    renderDocument: async () => {
      throw new Error("renderDocument should not be called in this test.");
    },
    render: async () => {
      throw new Error("render should not be called in this test.");
    },
  };
}

function createInlineArtifact(
  recipe: MatrixBuildRecipe,
  cleanup?: () => Promise<void>,
): MatrixArtifact {
  return {
    recipe,
    context: {
      outputDir: "dist/test-inline",
      targetName: "inline",
      mode: recipe.render,
      navigation: recipe.navigation,
      profile: recipe.profile,
      cleanup,
    },
    cleanup,
  };
}

Deno.test("matrix/harness: should expand rectangular exercise into the cartesian product", () => {
  assertEquals(
    expandMatrixExercise({
      render: ["ssg"],
      navigation: ["spa", "mpa"],
    }),
    [
      { render: "ssg", navigation: "spa" },
      { render: "ssg", navigation: "mpa" },
    ],
  );
});

Deno.test("matrix/harness: should preserve explicit exercise combinations", () => {
  assertEquals(
    expandMatrixExercise([
      { render: "ssg", navigation: "spa" },
      { render: "csr", navigation: "spa" },
    ]),
    [
      { render: "ssg", navigation: "spa" },
      { render: "csr", navigation: "spa" },
    ],
  );
});

Deno.test("matrix/harness: should detect whether a case exercises the current combo", () => {
  const testCase = matrixTest({
    name: "routing case",
    fixture: "RoutedApp",
    exercise: {
      render: ["ssg"],
      navigation: ["spa", "mpa"],
    },
    run: async () => {},
  });

  assertEquals(
    matrixCaseExercisesCombo(testCase, { render: "ssg", navigation: "spa" }),
    true,
  );
  assertEquals(
    matrixCaseExercisesCombo(testCase, { render: "csr", navigation: "spa" }),
    false,
  );
});

Deno.test("matrix/harness: should group cases by fixture, profile, render, and navigation", () => {
  const createCase = (
    input: Pick<MatrixCase, "name" | "fixture" | "profile">,
  ): MatrixCase =>
    matrixTest({
      ...input,
      exercise: {
        render: ["ssg"],
        navigation: ["spa"],
      },
      run: async () => {},
    });

  const groups = groupMatrixCasesByRecipe(
    [
      createCase({ name: "routing", fixture: "RoutedApp" }),
      createCase({ name: "head", fixture: "RoutedApp" }),
      createCase({
        name: "profiled",
        fixture: "RoutedApp",
        profile: "gh-pages",
      }),
    ],
    { render: "ssg", navigation: "spa" },
  );

  assertEquals(groups.length, 2);
  assertEquals(groups[0].cases.length, 2);
  assertEquals(groups[1].cases.length, 1);
});

Deno.test("matrix/harness: should build stable recipe keys", () => {
  assertEquals(
    getMatrixRecipeKey({
      fixture: "RoutedApp",
      render: "ssg",
      navigation: "spa",
    }),
    JSON.stringify(["RoutedApp", "", "ssg", "spa"]),
  );
});

Deno.test("matrix/harness: should format recipe diagnostics for grouped cases", () => {
  const groups = groupMatrixCasesByRecipe(
    [
      matrixTest({
        name: "routing",
        fixture: "RoutedApp",
        exercise: [{ render: "ssg", navigation: "spa" }],
        run: async () => {},
      }),
      matrixTest({
        name: "head",
        fixture: "RoutedApp",
        profile: "gh-pages",
        exercise: [{ render: "ssg", navigation: "spa" }],
        run: async () => {},
      }),
    ],
    { render: "ssg", navigation: "spa" },
  );

  assertEquals(
    formatMatrixRecipeDiagnostics({ render: "ssg", navigation: "spa" }, groups),
    [
      "[matrix] combo: render=ssg navigation=spa",
      "[matrix] recipe: fixture=RoutedApp profile=none render=ssg navigation=spa",
      "[matrix] cases:",
      "- routing",
      "[matrix] recipe: fixture=RoutedApp profile=gh-pages render=ssg navigation=spa",
      "[matrix] cases:",
      "- head",
    ].join("\n"),
  );
});

Deno.test("matrix/harness: should include artifact outputDir in diagnostics when available", () => {
  const combo = { render: "ssg", navigation: "spa" } as const;
  const groups = groupMatrixCasesByRecipe(
    [
      matrixTest({
        name: "routing",
        fixture: "RoutedApp",
        exercise: [combo],
        run: async () => {},
      }),
    ],
    combo,
  );
  const artifactOutputDirs = new Map([
    [
      getMatrixRecipeKey({
        fixture: "RoutedApp",
        render: "ssg",
        navigation: "spa",
      }),
      "dist/routed-app/ssg",
    ],
  ]);

  assertEquals(
    formatMatrixRecipeDiagnostics(combo, groups, artifactOutputDirs),
    [
      "[matrix] combo: render=ssg navigation=spa",
      "[matrix] recipe: fixture=RoutedApp profile=none render=ssg navigation=spa",
      "[matrix] artifact: outputDir=dist/routed-app/ssg",
      "[matrix] cases:",
      "- routing",
    ].join("\n"),
  );
});

Deno.test("matrix/harness: should append recipe diagnostics when fixture build fails", async () => {
  const combo = { render: "ssg", navigation: "spa" } as const;
  const recipe: MatrixBuildRecipe = {
    fixture: "RoutedApp",
    render: combo.render,
    navigation: combo.navigation,
  };

  const error = await assertRejects(
    () =>
      runMatrixCombo({
        t: createInlineStepRunner(),
        combo,
        cases: [
          matrixTest({
            name: "routing",
            fixture: "RoutedApp",
            exercise: [combo],
            run: async () => {},
          }),
        ],
        resolveFixtureDefinition: (fixtureId: FixtureId) => {
          assertEquals(fixtureId, "RoutedApp");
          return {
            id: fixtureId,
            build: async () => {
              throw new Error("build failed");
            },
            resolve: createInlineFixture,
          };
        },
      }),
  ) as Error;

  assertStringIncludes(error.message, "build failed");
  assertStringIncludes(
    error.message,
    formatMatrixRecipeDiagnostics(combo, [{
      recipe,
      cases: [{
        name: "routing",
        fixture: "RoutedApp",
        exercise: [combo],
        run: async () => {},
      }],
    }]),
  );
});

Deno.test("matrix/harness: should append recipe diagnostics when case execution fails", async () => {
  const combo = { render: "csr", navigation: "spa" } as const;
  const cleanupCalls: string[] = [];
  const failingCase = matrixTest({
    name: "navigation",
    fixture: "RoutedApp",
    exercise: [combo],
    run: async () => {
      throw new Error("case failed");
    },
  });

  const error = await assertRejects(
    () =>
      runMatrixCombo({
        t: createInlineStepRunner(),
        combo,
        cases: [failingCase],
        resolveFixtureDefinition: (fixtureId: FixtureId) => ({
          id: fixtureId,
          build: async (recipe) =>
            createInlineArtifact(recipe, async () => {
              cleanupCalls.push("cleanup");
            }),
          resolve: createInlineFixture,
        }),
      }),
  ) as Error;

  assertStringIncludes(error.message, "case failed");
  assertStringIncludes(
    error.message,
    "[matrix] combo: render=csr navigation=spa",
  );
  assertStringIncludes(
    error.message,
    "[matrix] artifact: outputDir=dist/test-inline",
  );
  assertStringIncludes(error.message, "- navigation");
  assertEquals(cleanupCalls, ["cleanup"]);
});
