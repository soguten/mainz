import { Component } from "mainz";

export class FactoryClassComponent extends Component<
    { label?: string; children?: unknown },
    Record<string, never>
> {
    override render(): HTMLElement {
        return (
            <div data-label={this.props.label ?? "none"}>
                {this.props.children as unknown}
            </div>
        );
    }
}

export function FactoryFunctionComponent(
    props: { prefix: string; children?: unknown },
): HTMLElement {
    return <p>{`${props.prefix}:${stringifyChildren(props.children)}`}</p>;
}

function stringifyChildren(children: unknown): string {
    const normalized = Array.isArray(children) ? children : [children];

    return normalized
        .filter((item) => item != null && typeof item !== "boolean")
        .map((item) => {
            if (item instanceof Node) {
                return item.textContent ?? "";
            }
            return String(item);
        })
        .join("|");
}
