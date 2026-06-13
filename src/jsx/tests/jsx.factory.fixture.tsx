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

export class FactoryEventPropComponent extends Component<
  {
    onInput?: (value: string) => void;
    state?: string;
    value?: string;
    count?: number;
    checked?: boolean;
    className?: string;
    title?: string;
    role?: string;
    "data-mode"?: string;
    "aria-label"?: string;
    style?: string;
    tabIndex?: number;
  },
  Record<string, never>
> {
  override render(): HTMLElement {
    return <div>probe</div>;
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
