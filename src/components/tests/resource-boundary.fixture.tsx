import { Component, ResourceBoundary } from "../index.ts";
import type { RenderStrategy, Resource } from "../../resources/index.ts";

export function createResourceBoundaryHarness<Value>(
    resource: Resource<void, void, Value>,
    options: {
        errorFallback?: (error: unknown) => unknown;
        withFallback?: boolean;
        renderStrategy?: RenderStrategy;
    } = {},
) {
    return class ResourceBoundaryHarness extends Component {
        override render() {
            return (
                <ResourceBoundary
                    resource={resource}
                    resolvedStrategy={options.renderStrategy ?? "deferred"}
                    params={undefined}
                    context={undefined}
                    fallback={options.withFallback === false ? undefined : () => <p data-role="status">loading</p>}
                    errorFallback={options.errorFallback
                        ? (error: unknown) => <p data-role="status">{String(options.errorFallback?.(error))}</p>
                        : undefined}
                >
                    {(value: Value) => <p data-role="status">{String((value as { title?: string }).title ?? value)}</p>}
                </ResourceBoundary>
            );
        }
    };
}

export function createSlugResourceBoundaryHarness<Value>(
    resource: Resource<{ slug: string }, void, Value>,
) {
    return class ResourceBoundarySlugHarness extends Component<{ slug: string }> {
        override render() {
            return (
                <ResourceBoundary
                    resource={resource}
                    resolvedStrategy="deferred"
                    params={{ slug: this.props.slug }}
                    context={undefined}
                    fallback={() => <p data-role="status">loading</p>}
                >
                    {(value: Value) => <p data-role="status">{String((value as { title?: string }).title ?? value)}</p>}
                </ResourceBoundary>
            );
        }
    };
}
