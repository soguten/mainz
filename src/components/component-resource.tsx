import { getCurrentRenderOwner } from "../jsx/render-owner.ts";
import type { Resource } from "../resources/index.ts";
import { resolveComponentRenderConfig } from "./component.ts";
import { ResourceBoundary } from "./resource-boundary.ts";

const warnedMissingAsyncFallbackOwners = new WeakSet<object>();

export interface ComponentResourceProps<Params = void, Context = void, Value = unknown> {
    resource: Resource<Params, Context, Value>;
    params: Params;
    context?: Context;
    children: ((value: Value) => unknown) | unknown;
}

/**
 * Preferred async data primitive for plain Mainz components that declare `@RenderStrategy(...)`.
 */
export function ComponentResource<Params = void, Context = void, Value = unknown>(
    props: ComponentResourceProps<Params, Context, Value>,
) {
    const owner = resolveComponentResourceOwner();
    const renderConfig = resolveComponentResourceRenderConfig(owner);
    warnAboutMissingAsyncFallback(owner, renderConfig);

    return (
        <ResourceBoundary
            resource={props.resource}
            resolvedStrategy={renderConfig.strategy}
            params={props.params}
            context={props.context as Context}
            fallback={renderConfig.fallback}
            errorFallback={renderConfig.errorFallback}
        >
            {props.children}
        </ResourceBoundary>
    );
}

function resolveComponentResourceOwner(): object {
    const owner = getCurrentRenderOwner();
    if (owner) {
        return owner;
    }

    throw new Error(
        "ComponentResource must be rendered inside a Mainz Component render pass.",
    );
}

function resolveComponentResourceRenderConfig(owner: object) {
    const ownerCtor = resolveOwnerConstructor(owner);
    const renderConfig = resolveComponentRenderConfig(ownerCtor);
    if (renderConfig) {
        return renderConfig;
    }

    const componentName = resolveOwnerName(ownerCtor);
    throw new Error(
        `ComponentResource owner "${componentName}" must declare @RenderStrategy(...). ` +
            "ComponentResource requires a fixed component-level render strategy.",
    );
}

function resolveOwnerConstructor(owner: object): object {
    const ownerWithConstructor = owner as { constructor?: object };
    return ownerWithConstructor.constructor ?? owner;
}

function resolveOwnerName(ownerCtor: object): string {
    const candidate = ownerCtor as { name?: string };
    return candidate.name || "AnonymousComponent";
}

function warnAboutMissingAsyncFallback(
    owner: object,
    renderConfig: {
        strategy: "blocking" | "deferred" | "client-only" | "forbidden-in-ssg";
        fallback?: unknown | (() => unknown);
    },
): void {
    if (renderConfig.strategy !== "deferred" && renderConfig.strategy !== "client-only") {
        return;
    }

    if (renderConfig.fallback !== undefined || warnedMissingAsyncFallbackOwners.has(owner)) {
        return;
    }

    const ownerCtor = resolveOwnerConstructor(owner);
    const componentName = resolveOwnerName(ownerCtor);
    console.warn(
        `ComponentResource owner "${componentName}" uses @RenderStrategy("${renderConfig.strategy}") without a fallback. ` +
            "Add a fallback to make the component's async placeholder explicit.",
    );
    warnedMissingAsyncFallbackOwners.add(owner);
}
