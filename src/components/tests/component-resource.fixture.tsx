import { Component, ComponentResource, RenderStrategy } from "../index.ts";
import type { Resource } from "../../resources/index.ts";

export function createComponentResourceHarness<Value>(
    resource: Resource<void, void, Value>,
) {
    @RenderStrategy("deferred", {
        fallback: () => <p data-role="status">loading</p>,
        errorFallback: (error: unknown) => (
            <p data-role="status">{error instanceof Error ? error.message : String(error)}</p>
        ),
    })
    class ComponentResourceHarness extends Component {
        override render() {
            return (
                <ComponentResource
                    resource={resource}
                    params={undefined}
                    context={undefined}
                >
                    {(value: Value) => <p data-role="status">{String((value as { title?: string }).title ?? value)}</p>}
                </ComponentResource>
            );
        }
    }

    return ComponentResourceHarness;
}

export function createComponentResourceHarnessWithoutStrategy<Value>(
    resource: Resource<void, void, Value>,
) {
    return class MissingStrategyComponentResourceHarness extends Component {
        override render() {
            return (
                <ComponentResource
                    resource={resource}
                    params={undefined}
                    context={undefined}
                >
                    {(value: Value) => <p data-role="status">{String((value as { title?: string }).title ?? value)}</p>}
                </ComponentResource>
            );
        }
    };
}

export function createComponentResourceHarnessWithoutFallback<Value>(
    resource: Resource<void, void, Value>,
) {
    @RenderStrategy("deferred")
    class MissingFallbackComponentResourceHarness extends Component {
        override render() {
            return (
                <ComponentResource
                    resource={resource}
                    params={undefined}
                    context={undefined}
                >
                    {(value: Value) => <p data-role="status">{String((value as { title?: string }).title ?? value)}</p>}
                </ComponentResource>
            );
        }
    }

    return MissingFallbackComponentResourceHarness;
}
