import { CustomElement, RenderStrategy, ResourceComponent, defineResource } from "../../index.ts";

const docsResource = defineResource({
    name: "docs",
    visibility: "public",
    execution: "either",
    load: async () => ({ title: "Docs" }),
});

@CustomElement("x-mainz-diagnostics-missing-strategy-resource-component")
export class MissingStrategyResourceComponent extends ResourceComponent<
    Record<string, never>,
    void,
    void,
    { title: string }
> {
    protected override getResource() {
        return docsResource;
    }

    protected override getResourceParams() {
        return undefined;
    }

    protected override renderResolved(value: { title: string }): HTMLElement {
        return <p>{value.title}</p>;
    }
}

@CustomElement("x-mainz-diagnostics-missing-fallback-resource-component")
@RenderStrategy("deferred")
export class MissingFallbackResourceComponent extends ResourceComponent<
    Record<string, never>,
    void,
    void,
    { title: string }
> {
    protected override getResource() {
        return docsResource;
    }

    protected override getResourceParams() {
        return undefined;
    }

    protected override renderResolved(value: { title: string }): HTMLElement {
        return <p>{value.title}</p>;
    }
}

@CustomElement("x-mainz-diagnostics-valid-resource-component")
@RenderStrategy("deferred", {
    fallback: () => <p>loading</p>,
})
export class ValidResourceComponent extends ResourceComponent<
    Record<string, never>,
    void,
    void,
    { title: string }
> {
    protected override getResource() {
        return docsResource;
    }

    protected override getResourceParams() {
        return undefined;
    }

    protected override renderResolved(value: { title: string }): HTMLElement {
        return <p>{value.title}</p>;
    }
}

const privateUserResource = defineResource({
    name: "current-user",
    visibility: "private",
    execution: "either",
    load: async () => ({ title: "Alexandre" }),
});

const clientPreviewResource = defineResource({
    name: "live-preview",
    visibility: "public",
    execution: "client",
    load: async () => ({ title: "Preview" }),
});

@CustomElement("x-mainz-diagnostics-blocking-private-resource-component")
@RenderStrategy("blocking", {
    fallback: () => <p>loading</p>,
})
export class BlockingPrivateResourceComponent extends ResourceComponent<
    Record<string, never>,
    void,
    void,
    { title: string }
> {
    protected override getResource() {
        return privateUserResource;
    }

    protected override getResourceParams() {
        return undefined;
    }

    protected override renderResolved(value: { title: string }): HTMLElement {
        return <p>{value.title}</p>;
    }
}

@CustomElement("x-mainz-diagnostics-blocking-client-resource-component")
@RenderStrategy("blocking", {
    fallback: () => <p>loading</p>,
})
export class BlockingClientResourceComponent extends ResourceComponent<
    Record<string, never>,
    void,
    void,
    { title: string }
> {
    protected override getResource() {
        return clientPreviewResource;
    }

    protected override getResourceParams() {
        return undefined;
    }

    protected override renderResolved(value: { title: string }): HTMLElement {
        return <p>{value.title}</p>;
    }
}

abstract class DeferredResourceComponentBase extends ResourceComponent<
    Record<string, never>,
    void,
    void,
    { title: string }
> {
    protected override getResource() {
        return docsResource;
    }

    protected override getResourceParams() {
        return undefined;
    }

    protected renderResourceFallback(): HTMLElement {
        return <p>loading from base</p>;
    }
}

@CustomElement("x-mainz-diagnostics-inherited-resource-component")
@RenderStrategy("deferred")
export class InheritedFallbackResourceComponent extends DeferredResourceComponentBase {
    protected override renderResolved(value: { title: string }): HTMLElement {
        return <p>{value.title}</p>;
    }
}
