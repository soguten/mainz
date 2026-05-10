/// <reference lib="deno.ns" />

import { describeBuiltOutput, isCsrBuiltOutput, isSsgBuiltOutput } from "../helpers/built-output-io.ts";
import type { TestBuildContext } from "../helpers/types.ts";
import type { TestNavigationMode } from "../helpers/types.ts";

export type BuiltNavigationMode = TestNavigationMode;

export type BuiltArtifactRecipe = {
  app: string;
  profile?: string;
  navigation: BuiltNavigationMode;
};

export type BuiltArtifact = {
  recipe: BuiltArtifactRecipe;
  context: TestBuildContext;
  cleanup?(): Promise<void>;
};

export function describeBuiltArtifact(artifact: BuiltArtifact): string {
  return describeBuiltOutput(artifact.context.outputDir);
}

export function isCsrArtifact(artifact: BuiltArtifact): boolean {
  return isCsrBuiltOutput(artifact.context.outputDir);
}

export function isSsgArtifact(artifact: BuiltArtifact): boolean {
  return isSsgBuiltOutput(artifact.context.outputDir);
}
