import {
    Component,
    ComponentResource,
    CustomElement,
    RenderStrategy,
    defineResource,
} from "../../index.ts";

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

const implicitPrivateResource = defineResource({
    name: "draft-preview",
    load: async () => ({ title: "Draft" }),
});

@CustomElement("x-mainz-diagnostics-component-resource-missing-strategy")
export class MissingStrategyComponentResourceOwner extends Component {
    override render() {
        return (
            <ComponentResource resource={docsResource} params={undefined} context={undefined}>
                {(value: { title: string }) => <p>{value.title}</p>}
            </ComponentResource>
        );
    }
}

@CustomElement("x-mainz-diagnostics-component-resource-missing-fallback")
@RenderStrategy("deferred")
export class MissingFallbackComponentResourceOwner extends Component {
    override render() {
        return (
            <ComponentResource resource={docsResource} params={undefined} context={undefined}>
                {(value: { title: string }) => <p>{value.title}</p>}
            </ComponentResource>
        );
    }
}

@CustomElement("x-mainz-diagnostics-component-resource-default-export")
export default class DefaultExportMissingStrategyComponentResourceOwner extends Component {
    override render() {
        return (
            <ComponentResource resource={docsResource} params={undefined} context={undefined}>
                {(value: { title: string }) => <p>{value.title}</p>}
            </ComponentResource>
        );
    }
}

@CustomElement("x-mainz-diagnostics-component-resource-valid")
@RenderStrategy("client-only", {
    fallback: () => <p>loading</p>,
})
export class ValidComponentResourceOwner extends Component {
    override render() {
        return (
            <ComponentResource resource={docsResource} params={undefined} context={undefined}>
                {(value: { title: string }) => <p>{value.title}</p>}
            </ComponentResource>
        );
    }
}

@CustomElement("x-mainz-diagnostics-component-resource-blocking-private")
@RenderStrategy("blocking", {
    fallback: () => <p>loading</p>,
})
export class BlockingPrivateComponentResourceOwner extends Component {
    override render() {
        return (
            <ComponentResource resource={currentUserResource} params={undefined} context={undefined}>
                {(value: { title: string }) => <p>{value.title}</p>}
            </ComponentResource>
        );
    }
}

@CustomElement("x-mainz-diagnostics-component-resource-blocking-client")
@RenderStrategy("blocking", {
    fallback: () => <p>loading</p>,
})
export class BlockingClientComponentResourceOwner extends Component {
    override render() {
        return (
            <ComponentResource resource={livePreviewResource} params={undefined} context={undefined}>
                {(value: { title: string }) => <p>{value.title}</p>}
            </ComponentResource>
        );
    }
}

@CustomElement("x-mainz-diagnostics-component-resource-blocking-implicit-private")
@RenderStrategy("blocking", {
    fallback: () => <p>loading</p>,
})
export class BlockingImplicitPrivateComponentResourceOwner extends Component {
    override render() {
        return (
            <ComponentResource
                resource={implicitPrivateResource}
                params={undefined}
                context={undefined}
            >
                {(value: { title: string }) => <p>{value.title}</p>}
            </ComponentResource>
        );
    }
}
