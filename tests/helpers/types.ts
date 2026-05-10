import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type {
  MainzTargetDefinition,
  NormalizedMainzTarget,
} from "../../src/config/types.ts";

export type TestNavigationMode = "spa" | "mpa";
export type TestBuildContext = {
  testAppName?: string;
  testAppRoot?: string;
  outputDir: string;
  targetName: string;
  navigation: TestNavigationMode;
  profile?: string;
  configPath?: string;
  cleanup?(): Promise<void>;
};
export type TestScenarioBuildContext = {
  testAppName?: string;
  testAppRoot?: string;
  availableBuilds: TestBuildContext[];
  targetName: string;
  navigation: TestNavigationMode;
  profile?: string;
  configPath?: string;
  cleanup?(): Promise<void>;
};
export type TestAppTargetConfig = {
  target: NormalizedMainzTarget;
  configPath: string;
  testAppRoot: string;
  outputDir: string;
  targetName: string;
  cleanup(): Promise<void>;
};
export type TestAppTargetDefinition = {
  target: NormalizedMainzTarget;
  targetDefinition: MainzTargetDefinition;
  testAppRoot: string;
  outputDir: string;
  targetName: string;
  cleanup(): Promise<void>;
};

export const cliTestsRepoRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
