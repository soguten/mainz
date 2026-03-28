import {
    AllowAnonymous,
    Authorize,
    Component,
    CustomElement,
    type NoProps,
    type NoState,
    RenderStrategy,
} from "../../index.ts";

@CustomElement("x-mainz-diagnostics-missing-strategy-load-component")
export class MissingStrategyLoadComponent extends Component<NoProps, NoState, { title: string }> {
    override async load() {
        return { title: "Docs" };
    }

    override render(): HTMLElement {
        return <p>{this.data.title}</p>;
    }
}

@CustomElement("x-mainz-diagnostics-missing-fallback-load-component")
@RenderStrategy("client-only")
export class MissingFallbackLoadComponent extends Component<NoProps, NoState, { title: string }> {
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

abstract class DeferredLoadBase extends Component<NoProps, NoState, { title: string }> {
    override async load() {
        return { title: "Guides" };
    }

    override render(): HTMLElement {
        return <p>{this.data.title}</p>;
    }
}

@CustomElement("x-mainz-diagnostics-valid-load-component")
@RenderStrategy("deferred", {
    fallback: () => <p>loading</p>,
})
export class ValidLoadComponent extends DeferredLoadBase {}

@CustomElement("x-mainz-diagnostics-blocking-fallback-component")
@RenderStrategy("blocking", {
    fallback: () => <p>loading</p>,
})
export class BlockingFallbackComponent extends DeferredLoadBase {}

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
