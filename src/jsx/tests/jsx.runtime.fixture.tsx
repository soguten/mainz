import { Component } from "mainz";

export const runtimeCapture: {
  lastProps: Record<string, unknown> | null;
} = {
  lastProps: null,
};

export function resetRuntimeCapture(): void {
  runtimeCapture.lastProps = null;
}

export function CapturePropsComponent(
  props: Record<string, unknown>,
): HTMLElement {
  runtimeCapture.lastProps = props;
  return <div>capture</div>;
}

export class RuntimeClassComponent extends Component<
  { label?: string; children?: unknown; key?: string },
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
