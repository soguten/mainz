import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { MainzTargetDefinition, NormalizedMainzTarget } from "../../src/config/types.ts";

export type TestRenderMode = "csr" | "ssg";
export type TestNavigationMode = "spa" | "mpa" | "enhanced-mpa";
export type TestBuildCombination = {
    mode: TestRenderMode;
    navigation: TestNavigationMode;
};
export type TestBuildContext = {
    fixtureName?: string;
    fixtureRoot?: string;
    outputDir: string;
    targetName: string;
    mode: TestRenderMode;
    navigation: TestNavigationMode;
    profile?: string;
    configPath?: string;
    cleanup?(): Promise<void>;
};
export type FixtureTargetConfig = {
    target: NormalizedMainzTarget;
    configPath: string;
    fixtureRoot: string;
    outputDir: string;
    targetName: string;
    cleanup(): Promise<void>;
};
export type FixtureTargetDefinition = {
    target: NormalizedMainzTarget;
    targetDefinition: MainzTargetDefinition;
    fixtureRoot: string;
    outputDir: string;
    targetName: string;
    cleanup(): Promise<void>;
};

export const cliTestsRepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const testCombinations = [
    { mode: "ssg", navigation: "spa" },
    { mode: "ssg", navigation: "mpa" },
    { mode: "ssg", navigation: "enhanced-mpa" },
    { mode: "csr", navigation: "spa" },
    { mode: "csr", navigation: "mpa" },
    { mode: "csr", navigation: "enhanced-mpa" },
] as const satisfies readonly TestBuildCombination[];
