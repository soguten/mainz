import { Page, RenderMode, Route, script } from "mainz";

@Route("/ssg")
@RenderMode("ssg")
export class SsgPage extends Page {
  override assets() {
    return [
      script({
        id: "ssg-docs-search",
        src: "/assets/docs-search.js",
        target: "body:end",
        strategy: "defer",
      }),
    ];
  }

  override render() {
    return <main>SSG public assets</main>;
  }
}
