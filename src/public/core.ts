/**
 * Public component authoring APIs for Mainz.
 */

export {
    Component,
    CustomElement,
    RenderPolicy,
    RenderStrategy,
    resolveComponentRenderConfig,
    resolveComponentRenderPolicy,
    resolveComponentRenderStrategy,
} from "../components/component.ts";
export { ensureMainzCustomElementDefined } from "../components/registry.ts";
export type { ChildrenOnlyProps, DefaultProps, DefaultState, NoProps, NoState } from "../components/types.ts";
export type { ComponentLoadContext, ComponentRenderConfig } from "../components/component.ts";
