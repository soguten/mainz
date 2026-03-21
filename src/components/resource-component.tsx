import { Component, resolveComponentRenderConfig } from "./component.ts";
import { ResourceBoundary } from "./resource-boundary.ts";
import type { RenderStrategy, Resource } from "../resources/index.ts";

const warnedMissingAsyncFallbackComponents = new WeakSet<object>();

/**
 * Secondary convenience base for resource-backed components.
 * Prefer `Component + @RenderStrategy(...) + ComponentResource` for new public examples and docs.
 */
export abstract class ResourceComponent<
    P = Record<string, never>,
    Params = void,
    Context = void,
    Value = unknown,
> extends Component<P> {
    protected abstract getResource(): Resource<Params, Context, Value>;
    protected abstract getResourceParams(): Params;
    protected renderResourceContext(): Context {
        return undefined as Context;
    }

    protected abstract renderResolved(value: Value): HTMLElement | DocumentFragment;
    protected renderResourceFallback(): unknown {
        return undefined;
    }

    protected renderResourceError(_error: unknown): unknown {
        return undefined;
    }

    override render(): HTMLElement | DocumentFragment {
        const resource = this.getResource();
        const renderConfig = resolveResourceComponentRenderConfig(this.constructor);
        warnAboutMissingAsyncFallback(this.constructor, renderConfig);
        const strategy = renderConfig.strategy;

        return (
            <ResourceBoundary
                resource={resource}
                resolvedStrategy={strategy}
                params={this.getResourceParams()}
                context={this.renderResourceContext()}
                fallback={() => this.resolveFallback(renderConfig)}
                errorFallback={(error: unknown) => this.resolveErrorFallback(renderConfig, error)}
            >
                {(value: Value) => this.renderResolved(value)}
            </ResourceBoundary>
        );
    }

    private resolveFallback(renderConfig: {
        fallback?: unknown | (() => unknown);
    }): unknown {
        const localFallback = this.renderResourceFallback();
        if (localFallback !== undefined) {
            return localFallback;
        }

        if (typeof renderConfig.fallback === "function") {
            return renderConfig.fallback();
        }

        return renderConfig.fallback;
    }

    private resolveErrorFallback(
        renderConfig: {
            fallback?: unknown | (() => unknown);
            errorFallback?: unknown | ((error: unknown) => unknown);
        },
        error: unknown,
    ): unknown {
        const localErrorFallback = this.renderResourceError(error);
        if (localErrorFallback !== undefined) {
            return localErrorFallback;
        }

        if (typeof renderConfig.errorFallback === "function") {
            return renderConfig.errorFallback(error);
        }

        if (renderConfig.errorFallback !== undefined) {
            return renderConfig.errorFallback;
        }

        return this.resolveFallback(renderConfig);
    }
}

function resolveResourceComponentRenderConfig(componentCtor: object): {
    strategy: RenderStrategy;
    fallback?: unknown | (() => unknown);
    errorFallback?: unknown | ((error: unknown) => unknown);
} {
    const renderConfig = resolveComponentRenderConfig(componentCtor);
    if (renderConfig) {
        return renderConfig;
    }

    const componentName = resolveComponentName(componentCtor);
    throw new Error(
        `ResourceComponent "${componentName}" must declare @RenderStrategy(...). ` +
            "ResourceComponent requires a fixed component-level render strategy.",
    );
}

function resolveComponentName(componentCtor: object): string {
    const candidate = componentCtor as { name?: string };
    return candidate.name || "AnonymousResourceComponent";
}

function warnAboutMissingAsyncFallback(
    componentCtor: object,
    renderConfig: {
        strategy: RenderStrategy;
        fallback?: unknown | (() => unknown);
    },
): void {
    if (renderConfig.strategy !== "deferred" && renderConfig.strategy !== "client-only") {
        return;
    }

    if (
        renderConfig.fallback !== undefined ||
        hasLocalResourceFallbackOverride(componentCtor) ||
        warnedMissingAsyncFallbackComponents.has(componentCtor)
    ) {
        return;
    }

    const componentName = resolveComponentName(componentCtor);
    console.warn(
        `ResourceComponent "${componentName}" uses @RenderStrategy("${renderConfig.strategy}") without a fallback. ` +
            "Add a fallback to make the component's async placeholder explicit.",
    );
    warnedMissingAsyncFallbackComponents.add(componentCtor);
}

function hasLocalResourceFallbackOverride(componentCtor: object): boolean {
    const componentPrototype = (componentCtor as { prototype?: object }).prototype;
    return Object.prototype.hasOwnProperty.call(componentPrototype, "renderResourceFallback");
}
