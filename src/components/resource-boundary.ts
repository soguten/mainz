import { Component } from "./component.ts";
import {
    readResource,
    ResourceAccessError,
    type RenderStrategy,
    type Resource,
    type ResourceRuntime,
} from "../resources/index.ts";
import type { RenderMode } from "../routing/index.ts";

export interface ResourceBoundaryProps<Params = void, Context = void, Value = unknown> {
    resource: Resource<Params, Context, Value>;
    resolvedStrategy: RenderStrategy;
    params: Params;
    context: Context;
    fallback?: unknown | (() => unknown);
    errorFallback?: unknown | ((error: unknown) => unknown);
    children?: ((value: Value) => unknown) | unknown;
}

interface ResourceBoundaryState<Value = unknown> {
    status: "idle" | "loading" | "resolved" | "rejected";
    data?: Value;
    error?: unknown;
}

/**
 * Low-level async rendering primitive used by higher-level component helpers.
 * Prefer `ComponentResource` for the main user-facing component path.
 */
export class ResourceBoundary<
    Params = void,
    Context = void,
    Value = unknown,
> extends Component<ResourceBoundaryProps<Params, Context, Value>, ResourceBoundaryState<Value>> {
    private activeRequestId = 0;
    private currentLoadKey?: string;
    private warnedMissingFallback = false;

    protected override initState(): ResourceBoundaryState<Value> {
        return {
            status: "idle",
        };
    }

    override onMount(): void {
        this.ensureResourceLoad();
    }

    override afterRender(): void {
        super.afterRender?.();
        this.ensureResourceLoad();
    }

    override render() {
        if (this.state.status === "resolved" && typeof this.props.children === "function") {
            return this.props.children(this.state.data as Value);
        }

        if (this.state.status === "resolved") {
            return this.props.children ?? null;
        }

        if (this.state.status === "rejected") {
            if (typeof this.props.errorFallback === "function") {
                const resolvedErrorFallback = this.props.errorFallback(this.state.error);
                if (resolvedErrorFallback !== undefined) {
                    return resolvedErrorFallback;
                }

                return this.renderFallback();
            }

            return this.props.errorFallback ?? this.renderFallback();
        }

        return this.renderFallback();
    }

    private ensureResourceLoad(): void {
        const nextLoadKey = this.computeLoadKey();
        if (nextLoadKey === this.currentLoadKey && this.state.status !== "idle") {
            return;
        }

        this.currentLoadKey = nextLoadKey;

        if (this.shouldWaitForClientRuntime()) {
            this.warnAboutMissingSsgFallback();
            this.setState({
                status: "loading",
                data: undefined,
                error: undefined,
            });
            return;
        }

        this.loadResource(nextLoadKey);
    }

    private loadResource(loadKey: string): void {
        const requestId = ++this.activeRequestId;

        this.setState({
            status: "loading",
            data: undefined,
            error: undefined,
        });

        const environment = resolveResourceBoundaryEnvironment();
        let resourceRead: Value | Promise<Value>;
        try {
            resourceRead = readResource(this.props.resource, this.props.params, this.props.context, {
                renderMode: environment.renderMode,
                runtime: environment.runtime,
                consumer: "resource-boundary",
                renderStrategy: this.resolveStrategy(),
            });
        } catch (error) {
            if (shouldPropagateSsgBuildFailure(error, environment)) {
                throw error;
            }

            this.currentLoadKey = loadKey;
            this.setState({
                status: "rejected",
                data: undefined,
                error,
            });
            return;
        }

        Promise.resolve(resourceRead)
            .then((data) => {
                if (requestId !== this.activeRequestId) {
                    return;
                }

                this.currentLoadKey = loadKey;
                this.setState({
                    status: "resolved",
                    data,
                    error: undefined,
                });
            })
            .catch((error) => {
                if (requestId !== this.activeRequestId) {
                    return;
                }

                this.currentLoadKey = loadKey;
                this.setState({
                    status: "rejected",
                    data: undefined,
                    error,
                });
            });
    }

    private computeLoadKey(): string {
        const resourceKey = this.props.resource.key(this.props.params);
        return JSON.stringify({
            resource: this.props.resource.name,
            key: resourceKey ?? this.props.params ?? null,
        });
    }

    private shouldWaitForClientRuntime(): boolean {
        const environment = resolveResourceBoundaryEnvironment();
        return environment.renderMode === "ssg" &&
            environment.runtime === "build" &&
            (this.resolveStrategy() === "deferred" || this.resolveStrategy() === "client-only");
    }

    private renderFallback(): unknown {
        if (typeof this.props.fallback === "function") {
            const resolvedFallback = this.props.fallback();
            if (resolvedFallback !== undefined) {
                return resolvedFallback;
            }

            return document.createDocumentFragment();
        }

        if (this.props.fallback !== undefined) {
            return this.props.fallback;
        }

        return document.createDocumentFragment();
    }

    private warnAboutMissingSsgFallback(): void {
        if (this.warnedMissingFallback || this.props.fallback !== undefined) {
            return;
        }

        console.warn(
            `ResourceBoundary for resource "${this.props.resource.name}" is using strategy "${this.resolveStrategy()}" during SSG without a fallback. Provide a fallback to avoid empty prerender output.`,
        );
        this.warnedMissingFallback = true;
    }

    private resolveStrategy(): RenderStrategy {
        return this.props.resolvedStrategy;
    }
}

function resolveResourceBoundaryEnvironment(): {
    renderMode: RenderMode;
    runtime: ResourceRuntime;
} {
    return {
        renderMode: resolveMainzRenderMode(),
        runtime: resolveMainzRuntime(),
    };
}

function resolveMainzRenderMode(): RenderMode {
    if (typeof __MAINZ_RENDER_MODE__ !== "undefined") {
        return __MAINZ_RENDER_MODE__;
    }

    const fromGlobal = (globalThis as Record<string, unknown>).__MAINZ_RENDER_MODE__;
    return fromGlobal === "ssg" ? "ssg" : "csr";
}

function resolveMainzRuntime(): ResourceRuntime {
    if (typeof __MAINZ_RUNTIME_ENV__ !== "undefined") {
        return __MAINZ_RUNTIME_ENV__;
    }

    const fromGlobal = (globalThis as Record<string, unknown>).__MAINZ_RUNTIME_ENV__;
    return fromGlobal === "build" ? "build" : "client";
}

function shouldPropagateSsgBuildFailure(
    error: unknown,
    environment: { renderMode: RenderMode; runtime: ResourceRuntime },
): boolean {
    return environment.renderMode === "ssg" &&
        environment.runtime === "build" &&
        error instanceof ResourceAccessError;
}
