import { Component } from "mainz";

export class ExampleJSXTemplateComponent extends Component<
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
