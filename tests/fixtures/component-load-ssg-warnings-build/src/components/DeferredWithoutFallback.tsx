import { Component, CustomElement, type NoProps, type NoState, RenderStrategy } from "mainz";

@CustomElement("x-component-load-deferred-without-fallback")
@RenderStrategy("defer")
export class DeferredWithoutFallback extends Component<NoProps, NoState, { title: string }> {
    override async load(): Promise<{ title: string }> {
        throw new Error("DeferredWithoutFallback.load() should not run during SSG build.");
    }

    override render() {
        return <p data-role="deferred-missing-fallback-value">{this.data.title}</p>;
    }
}
