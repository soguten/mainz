import { CustomElement, RenderStrategy, ResourceComponent, defineResource } from "mainz";

const docsResource = defineResource({
    name: "docs",
    visibility: "public",
    execution: "either",
    load: async () => ({ title: "Docs" }),
});

const currentUserResource = defineResource({
    name: "current-user",
    visibility: "private",
    execution: "either",
    load: async () => ({ title: "Alexandre" }),
});

const livePreviewResource = defineResource({
    name: "live-preview",
    visibility: "public",
    execution: "client",
    load: async () => ({ title: "Preview" }),
});

@CustomElement("x-mainz-diagnostics-routes-missing-strategy-resource-component")
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

@CustomElement("x-mainz-diagnostics-routes-missing-fallback-resource-component")
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

@CustomElement("x-mainz-diagnostics-routes-blocking-private-resource-component")
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
        return currentUserResource;
    }

    protected override getResourceParams() {
        return undefined;
    }

    protected override renderResolved(value: { title: string }): HTMLElement {
        return <p>{value.title}</p>;
    }
}

@CustomElement("x-mainz-diagnostics-routes-blocking-client-resource-component")
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
        return livePreviewResource;
    }

    protected override getResourceParams() {
        return undefined;
    }

    protected override renderResolved(value: { title: string }): HTMLElement {
        return <p>{value.title}</p>;
    }
}
