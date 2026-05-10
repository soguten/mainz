import {
  Component,
  CustomElement,
  type NoProps,
  type NoState,
  RenderPolicy,
  RenderStrategy,
} from "mainz";

@CustomElement("x-component-load-client-only-with-fallback")
@RenderStrategy("blocking")
@RenderPolicy("placeholder-in-ssg")
export class ClientOnlyWithFallback
  extends Component<NoProps, NoState, { title: string }> {
  override async load(): Promise<{ title: string }> {
    throw new Error(
      "ClientOnlyWithFallback.load() should not run during SSG build.",
    );
  }

  override placeholder() {
    return <p data-role="client-only-fallback">loading recent docs</p>;
  }

  override render() {
    return <p data-role="client-only-value">{this.data.title}</p>;
  }
}
