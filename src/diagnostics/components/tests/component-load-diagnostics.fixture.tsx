import {
    AllowAnonymous,
    Authorize,
    Component,
    CustomElement,
    type NoProps,
    type NoState,
    RenderPolicy,
    RenderStrategy,
} from "../../../index.ts";

@CustomElement("x-mainz-diagnostics-missing-strategy-load-component")
export class MissingStrategyLoadComponent extends Component<NoProps, NoState, { title: string }> {
    override async load() {
        return { title: "Docs" };
    }

    override render(): HTMLElement {
        return <p>{this.data.title}</p>;
    }
}

@CustomElement("x-mainz-diagnostics-missing-placeholder-load-component")
export class MissingPlaceholderLoadComponent
    extends Component<NoProps, NoState, { title: string }> {
    override async load() {
        return { title: "Preview" };
    }

    override render(): HTMLElement {
        return <p>{this.data.title}</p>;
    }
}

@CustomElement("x-mainz-diagnostics-strategy-without-load-component")
@RenderStrategy("blocking")
export class StrategyWithoutLoadComponent extends Component {
    override render(): HTMLElement {
        return <p>Static content</p>;
    }
}

@CustomElement("x-mainz-diagnostics-render-data-without-load-component")
export class RenderDataWithoutLoadComponent extends Component {
    override render(data: unknown): HTMLElement {
        return <p>{String(data)}</p>;
    }
}

@CustomElement("x-mainz-diagnostics-render-data-without-explicit-data-component")
export class RenderDataWithoutExplicitDataComponent extends Component {
    override async load() {
        return { title: "Untyped" };
    }

    override render(data: { title: string }): HTMLElement {
        return <p>{data.title}</p>;
    }
}

@CustomElement("x-mainz-diagnostics-render-data-unknown-component")
export class RenderDataUnknownComponent extends Component {
    override async load() {
        return { title: "Unknown" };
    }

    override render(data: unknown): HTMLElement {
        return <p>{String(data)}</p>;
    }
}

abstract class DeferLoadBase extends Component<NoProps, NoState, { title: string }> {
    override async load() {
        return { title: "Guides" };
    }

    override placeholder(): HTMLElement {
        return <p>loading</p>;
    }

    override render(): HTMLElement {
        return <p>{this.data.title}</p>;
    }
}

@CustomElement("x-mainz-diagnostics-valid-load-component")
@RenderStrategy("defer")
export class ValidLoadComponent extends DeferLoadBase {}

@CustomElement("x-mainz-diagnostics-blocking-placeholder-component")
@RenderStrategy("blocking")
export class BlockingPlaceholderComponent extends DeferLoadBase {}

@CustomElement("x-mainz-diagnostics-placeholder-in-ssg-component")
@RenderPolicy("placeholder-in-ssg")
export class PlaceholderInSsgWithoutPlaceholderComponent extends Component {
    override render(): HTMLElement {
        return <p>Static content</p>;
    }
}

@CustomElement("x-mainz-diagnostics-placeholder-without-load-component")
export class PlaceholderWithoutLoadComponent extends Component {
    override placeholder(): HTMLElement {
        return <p>loading static content</p>;
    }

    override render(): HTMLElement {
        return <p>Static content</p>;
    }
}

@CustomElement("x-mainz-diagnostics-error-without-load-component")
export class ErrorWithoutLoadComponent extends Component {
    override error(error: unknown): HTMLElement {
        return <p>{String(error)}</p>;
    }

    override render(): HTMLElement {
        return <p>Static content</p>;
    }
}

@CustomElement("x-mainz-diagnostics-allow-anonymous-component")
@AllowAnonymous()
export class AllowAnonymousComponent extends Component {
    override render(): HTMLElement {
        return <p>Anonymous content</p>;
    }
}

@CustomElement("x-mainz-diagnostics-authorized-component")
@Authorize({ roles: ["admin"] })
export class AuthorizedComponent extends Component {
    override render(): HTMLElement {
        return <p>Protected content</p>;
    }
}

@CustomElement("x-mainz-diagnostics-policy-component")
@Authorize({ policy: "org-member" })
export class PolicyProtectedComponent extends Component {
    override render(): HTMLElement {
        return <p>Policy protected content</p>;
    }
}
