import {
    Component,
    ComponentResource,
    CustomElement,
    RenderStrategy,
    defineResource,
} from "mainz";

const livePreviewResource = defineResource({
    name: "live-preview",
    visibility: "public",
    execution: "either",
    async load() {
        return { title: "Preview" };
    },
});

@CustomElement("x-forbidden-in-ssg-live-preview")
@RenderStrategy("forbidden-in-ssg", {
    fallback: () => <p>fallback</p>,
    errorFallback: () => <p>error</p>,
})
export class LivePreview extends Component {
    override render() {
        return (
            <ComponentResource resource={livePreviewResource} params={undefined} context={undefined}>
                {(value: { title: string }) => <p>{value.title}</p>}
            </ComponentResource>
        );
    }
}
