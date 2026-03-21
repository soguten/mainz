import {
    Component,
    ComponentResource,
    RenderStrategy,
} from "../index.ts";
import type { RenderStrategy as RenderStrategyValue, Resource } from "../../resources/index.ts";

export function createStrategyMatrixHarness<Value>(
    strategy: RenderStrategyValue,
    resource: Resource<void, void, Value>,
) {
    @RenderStrategy(strategy, {
        fallback: () => <p data-role="status">loading</p>,
    })
    class StrategyMatrixHarness extends Component {
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

    return StrategyMatrixHarness;
}
