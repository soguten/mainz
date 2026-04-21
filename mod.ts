/**
 * Public JSR entrypoint for incremental Mainz releases.
 *
 * This facade intentionally grows in small steps so we can validate package
 * publication behavior without coupling it to the repo's internal entrypoints.
 *
 * @module
 */

export { Component } from "./src/components/component.ts";
export type { ComponentLoadContext } from "./src/components/component.ts";
export type {
    ChildrenOnlyProps,
    DefaultProps,
    DefaultState,
    NoProps,
    NoState,
} from "./src/components/types.ts";
