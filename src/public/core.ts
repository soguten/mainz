/**
 * Public component authoring APIs for Mainz.
 */

export {
    Component,
    ComponentElementBase,
    CustomElement,
    RenderPolicy,
    RenderStrategy,
    resolveComponentRenderConfig,
    resolveComponentRenderPolicy,
    resolveComponentRenderStrategy,
} from "../components/component.ts";
export { ensureMainzCustomElementDefined } from "../components/registry.ts";
export type { PublicComponentRenderArgs } from "../components/component.ts";
export type {
    ComponentRenderConfig,
    ComponentRenderPolicy,
    ComponentRenderStrategy,
} from "../components/component.ts";
export type { Principal } from "../authorization/index.ts";
export type { ChildrenOnlyProps, DefaultProps, DefaultState, NoProps, NoState } from "../components/types.ts";
export type { PageRouteParams } from "../components/page-contract.ts";
export type { ComponentLoadContext } from "../components/component.ts";
export type { RouteContext, RouteProfileContext } from "../components/route-context.ts";
export type { NavigationMode, RenderMode } from "../routing/types.ts";
