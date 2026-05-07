import {
  Component,
  CustomElement,
  type NoProps,
  type NoState,
  RenderStrategy,
} from "mainz";

@CustomElement("x-component-load-deferred-with-fallback")
@RenderStrategy("defer")
export class DeferredWithFallback
  extends Component<NoProps, NoState, { title: string }> {
  override async load(): Promise<{ title: string }> {
    throw new Error(
      "DeferredWithFallback.load() should not run during SSG build.",
    );
  }

  override placeholder() {
    return <p data-role="deferred-fallback">loading related docs</p>;
  }

  override render() {
    return <p data-role="deferred-value">{this.data.title}</p>;
  }
}
