import {
    Component,
    CustomElement,
    RenderPolicy,
    RenderStrategy,
    type NoProps,
    type NoState,
} from "../../../index.ts";

/**
 * @mainz-diagnostics-ignore
 * component-load-missing-placeholder: fixture intentionally omits placeholder UI
 */
@CustomElement("x-mainz-suppressed-load-component")
@RenderStrategy("defer")
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
@RenderStrategy("defer")
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
 * component-load-missing-placeholder: primary reason
 * component-load-missing-placeholder: duplicate reason
 */
@CustomElement("x-mainz-duplicate-suppression-component")
@RenderStrategy("defer")
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
 * component-load-missing-placeholder: no longer needed
 */
@CustomElement("x-mainz-unused-suppression-component")
@RenderPolicy("placeholder-in-ssg")
export class UnusedSuppressionComponent extends Component {
    override placeholder(): HTMLElement {
        return <p>placeholder</p>;
    }

    override render(): HTMLElement {
        return <p>unused</p>;
    }
}
