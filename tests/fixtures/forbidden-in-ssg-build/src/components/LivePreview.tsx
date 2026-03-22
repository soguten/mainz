import { Component, CustomElement, type NoProps, type NoState, RenderStrategy } from "mainz";

@CustomElement("x-forbidden-in-ssg-live-preview")
@RenderStrategy("forbidden-in-ssg", {
    fallback: () => <p>fallback</p>,
    errorFallback: () => <p>error</p>,
})
export class LivePreview extends Component<NoProps, NoState, { title: string }> {
    override async load() {
        return { title: "Preview" };
    }

    override render() {
        return <p>{this.data.title}</p>;
    }
}
