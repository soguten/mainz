/**
 * Public configuration helpers for Mainz project configuration files.
 */

export { defineMainzConfig, defineTargetBuild } from "../config/definition.ts";

export type {
    LoadedMainzConfig,
    MainzConfig,
    MainzTargetDefinition,
    MainzTargetViteAlias,
    MainzTargetViteOptions,
    NormalizedMainzConfig,
    NormalizedMainzTarget,
    NormalizedTargetBuildDefinition,
    NormalizedTargetBuildProfile,
    TargetBuildDefinition,
    TargetBuildProfileDefinition,
} from "../config/types.ts";
