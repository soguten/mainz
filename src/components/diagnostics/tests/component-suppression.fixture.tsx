import { Component, CustomElement, RenderStrategy, type NoProps, type NoState } from "../../../index.ts";

/**
 * @mainz-diagnostics-ignore
 * component-load-missing-fallback: fixture intentionally omits fallback UI
 */
@CustomElement("x-mainz-suppressed-load-component")
@RenderStrategy("client-only")
export class UsedSuppressedComponent extends Component<NoProps, NoState, { title: string }> {
    override async load() {
        return { title: "suppressed" };
    }

    override render(): HTMLElement {
        return <p>{this.data.title}</p>;
    }
}

/**
 * @mainz-diagnostics-ignore
 * not-a-real-code: should warn and leave the real diagnostic visible
 */
@CustomElement("x-mainz-unknown-suppression-component")
@RenderStrategy("client-only")
export class UnknownSuppressionComponent extends Component<NoProps, NoState, { title: string }> {
    override async load() {
        return { title: "unknown" };
    }

    override render(): HTMLElement {
        return <p>{this.data.title}</p>;
    }
}

/**
 * @mainz-diagnostics-ignore
 * component-load-missing-fallback: primary reason
 * component-load-missing-fallback: duplicate reason
 */
@CustomElement("x-mainz-duplicate-suppression-component")
@RenderStrategy("client-only")
export class DuplicateSuppressionComponent extends Component<NoProps, NoState, { title: string }> {
    override async load() {
        return { title: "duplicate" };
    }

    override render(): HTMLElement {
        return <p>{this.data.title}</p>;
    }
}

/**
 * @mainz-diagnostics-ignore
 * component-load-missing-fallback: no longer needed
 */
@CustomElement("x-mainz-unused-suppression-component")
export class UnusedSuppressionComponent extends Component {
    override render(): HTMLElement {
        return <p>unused</p>;
    }
}
