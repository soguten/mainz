/// <reference lib="deno.ns" />

import type {
  TestBuildCombination,
  TestBuildContext,
} from "../helpers/types.ts";
import { testCombinations } from "../helpers/types.ts";
import {
  type FixtureId,
  fixtures,
  resolveFixtureDefinition,
} from "./fixtures.ts";
import type { ResolvedFixture } from "./render-fixture.ts";

export type MatrixRender = TestBuildCombination["mode"];
export type MatrixNavigation = TestBuildCombination["navigation"];

export type MatrixCombo = {
  render: MatrixRender;
  navigation: MatrixNavigation;
};

export type MatrixRectangularExercise = {
  render?: readonly MatrixRender[];
  navigation?: readonly MatrixNavigation[];
};

export type MatrixExercise =
  | MatrixRectangularExercise
  | readonly MatrixCombo[];

export type MatrixBuildRecipe = {
  fixture: FixtureId;
  profile?: string;
  render: MatrixRender;
  navigation: MatrixNavigation;
};

export type MatrixArtifact = {
  recipe: MatrixBuildRecipe;
  context: TestBuildContext;
  cleanup?(): Promise<void>;
};

export type MatrixFixture = ResolvedFixture;

export type MatrixCase = {
  name: string;
  fixture: FixtureId;
  profile?: string;
  exercise: MatrixExercise;
  run(args: {
    combo: MatrixCombo;
    artifact: MatrixArtifact;
    fixture: MatrixFixture;
    t: Deno.TestContext;
  }): Promise<void>;
};

type MatrixCaseGroup = {
  recipe: MatrixBuildRecipe;
  cases: MatrixCase[];
};

type MatrixFixtureDefinitionResolver = typeof resolveFixtureDefinition;
type MatrixStepRunner = Pick<Deno.TestContext, "step">;

const defaultMatrixCombos = testCombinations.map((
  combo: TestBuildCombination,
) => ({
  render: combo.mode,
  navigation: combo.navigation,
})) satisfies readonly MatrixCombo[];
const defaultMatrixRenders = [
  "csr",
  "ssg",
] as const satisfies readonly MatrixRender[];
const defaultMatrixNavigations = [
  "spa",
  "mpa",
] as const satisfies readonly MatrixNavigation[];

export function matrixTest(input: MatrixCase): MatrixCase {
  return input;
}

export function defineMatrixSuite(input: {
  name: string;
  cases: readonly MatrixCase[];
  combos?: readonly MatrixCombo[];
}): void {
  const combos = input.combos ?? defaultMatrixCombos;

  for (const combo of combos) {
    Deno.test(`${input.name}: ${combo.render} + ${combo.navigation}`, async (t) => {
      await runMatrixCombo({
        t,
        combo,
        cases: input.cases,
      });
    });
  }
}

export async function runMatrixCombo(args: {
  t: MatrixStepRunner;
  combo: MatrixCombo;
  cases: readonly MatrixCase[];
  resolveFixtureDefinition?: MatrixFixtureDefinitionResolver;
}): Promise<void> {
  const groups = groupMatrixCasesByRecipe(args.cases, args.combo);
  logMatrixDiagnostics(args.combo, groups);

  for (const group of groups) {
    const fixtureDefinition =
      (args.resolveFixtureDefinition ?? resolveFixtureDefinition)(
        group.recipe.fixture,
      );
    try {
      const artifact = await fixtureDefinition.build(group.recipe);
      const resolvedFixture = fixtureDefinition.resolve();
      const artifactOutputDirs = new Map([[
        getMatrixRecipeKey(group.recipe),
        artifact.context.outputDir,
      ]]);

      try {
        for (const testCase of group.cases) {
          await args.t.step(testCase.name, async (step) => {
            try {
              await testCase.run({
                combo: args.combo,
                artifact,
                fixture: resolvedFixture,
                t: step,
              });
            } catch (error) {
              throw createMatrixDiagnosticsError(
                error,
                args.combo,
                [group],
                artifactOutputDirs,
              );
            }
          });
        }
      } finally {
        await artifact.cleanup?.();
      }
    } catch (error) {
      throw createMatrixDiagnosticsError(error, args.combo, [group]);
    }
  }
}

export function expandMatrixExercise(
  exercise: MatrixExercise,
): MatrixCombo[] {
  if (isExplicitMatrixExercise(exercise)) {
    return dedupeCombos(exercise);
  }

  const renders = exercise.render?.length
    ? exercise.render
    : defaultMatrixRenders;
  const navigations = exercise.navigation?.length
    ? exercise.navigation
    : defaultMatrixNavigations;

  const combos: MatrixCombo[] = [];

  for (const render of renders) {
    for (const navigation of navigations) {
      combos.push({ render, navigation });
    }
  }

  return dedupeCombos(combos);
}

export function matrixCaseExercisesCombo(
  testCase: MatrixCase,
  combo: MatrixCombo,
): boolean {
  return expandMatrixExercise(testCase.exercise).some((entry) =>
    entry.render === combo.render && entry.navigation === combo.navigation
  );
}

export function resolveMatrixBuildRecipe(
  testCase: MatrixCase,
  combo: MatrixCombo,
): MatrixBuildRecipe {
  return {
    fixture: testCase.fixture,
    profile: testCase.profile,
    render: combo.render,
    navigation: combo.navigation,
  };
}

export function groupMatrixCasesByRecipe(
  cases: readonly MatrixCase[],
  combo: MatrixCombo,
): MatrixCaseGroup[] {
  const groups = new Map<string, MatrixCaseGroup>();

  for (const testCase of cases) {
    if (!matrixCaseExercisesCombo(testCase, combo)) {
      continue;
    }

    const recipe = resolveMatrixBuildRecipe(testCase, combo);
    const key = getMatrixRecipeKey(recipe);
    const existing = groups.get(key);

    if (existing) {
      existing.cases.push(testCase);
      continue;
    }

    groups.set(key, {
      recipe,
      cases: [testCase],
    });
  }

  return [...groups.values()];
}

export function getMatrixRecipeKey(recipe: MatrixBuildRecipe): string {
  return JSON.stringify([
    recipe.fixture,
    recipe.profile ?? "",
    recipe.render,
    recipe.navigation,
  ]);
}

export function formatMatrixRecipeDiagnostics(
  combo: MatrixCombo,
  groups: readonly MatrixCaseGroup[],
  artifactOutputDirs?: ReadonlyMap<string, string>,
): string {
  const lines = [
    `[matrix] combo: render=${combo.render} navigation=${combo.navigation}`,
  ];

  for (const group of groups) {
    const outputDir = artifactOutputDirs?.get(getMatrixRecipeKey(group.recipe));
    lines.push(
      `[matrix] recipe: fixture=${group.recipe.fixture} profile=${
        group.recipe.profile ?? "none"
      } render=${group.recipe.render} navigation=${group.recipe.navigation}`,
    );
    if (outputDir) {
      lines.push(`[matrix] artifact: outputDir=${outputDir}`);
    }
    lines.push("[matrix] cases:");
    for (const testCase of group.cases) {
      lines.push(`- ${testCase.name}`);
    }
  }

  return lines.join("\n");
}

function dedupeCombos(combos: readonly MatrixCombo[]): MatrixCombo[] {
  const deduped = new Map<string, MatrixCombo>();

  for (const combo of combos) {
    deduped.set(`${combo.render}:${combo.navigation}`, combo);
  }

  return [...deduped.values()];
}

function isExplicitMatrixExercise(
  exercise: MatrixExercise,
): exercise is readonly MatrixCombo[] {
  return Array.isArray(exercise);
}

function logMatrixDiagnostics(
  combo: MatrixCombo,
  groups: readonly MatrixCaseGroup[],
): void {
  if (Deno.env.get("MAINZ_MATRIX_VERBOSE") !== "1") {
    return;
  }

  console.log(formatMatrixRecipeDiagnostics(combo, groups));
}

function createMatrixDiagnosticsError(
  error: unknown,
  combo: MatrixCombo,
  groups: readonly MatrixCaseGroup[],
  artifactOutputDirs?: ReadonlyMap<string, string>,
): Error {
  const details = error instanceof Error ? error.message : String(error);
  return new Error(
    `${details}\n\n${
      formatMatrixRecipeDiagnostics(combo, groups, artifactOutputDirs)
    }`,
  );
}

export { fixtures };
