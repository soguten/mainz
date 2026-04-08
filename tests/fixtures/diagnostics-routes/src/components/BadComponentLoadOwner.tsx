import { Component, CustomElement, type NoProps, type NoState, RenderStrategy } from "mainz";

@CustomElement("x-mainz-diagnostics-routes-missing-strategy-load-owner")
export class MissingStrategyLoadOwner extends Component<NoProps, NoState, { title: string }> {
    override async load() {
        return { title: "Docs" };
    }

    override render(): HTMLElement {
        return <p>{this.data.title}</p>;
    }
}

@CustomElement("x-mainz-diagnostics-routes-missing-fallback-load-owner")
@RenderStrategy("defer")
export class MissingFallbackLoadOwner extends Component<NoProps, NoState, { title: string }> {
    override async load() {
        return { title: "Preview" };
    }

    override render(): HTMLElement {
        return <p>{this.data.title}</p>;
    }
}

@CustomElement("x-mainz-diagnostics-routes-strategy-without-load-owner")
@RenderStrategy("blocking")
export class StrategyWithoutLoadOwner extends Component {
    override render(): HTMLElement {
        return <p>Static content</p>;
    }
}
