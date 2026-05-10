import {
  Component,
  CustomElement,
  type NoProps,
  type NoState,
  RenderPolicy,
} from "mainz";

@CustomElement("x-forbidden-in-ssg-live-preview")
@RenderPolicy("forbidden-in-ssg")
export class LivePreview
  extends Component<NoProps, NoState, { title: string }> {
  override async load() {
    return { title: "Preview" };
  }

  override render() {
    return <p>{this.data.title}</p>;
  }
}
