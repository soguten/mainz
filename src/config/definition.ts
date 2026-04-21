import type { MainzConfig, TargetBuildDefinition } from "./types.ts";

/**
 * Marks an object as a Mainz project configuration.
 */
export function defineMainzConfig(config: MainzConfig): MainzConfig {
    return config;
}

/**
 * Marks an object as a Mainz target build configuration.
 */
export function defineTargetBuild(config: TargetBuildDefinition): TargetBuildDefinition {
    return config;
}
