import { Page, RenderMode, Route, script } from "mainz";

@Route("/ssr")
@RenderMode("ssr")
export class SsrPage extends Page {
  override assets() {
    return [
      script({
        id: "ssr-docs-search",
        src: "/assets/docs-search.js",
        target: "body:end",
        strategy: "defer",
      }),
    ];
  }

  override render() {
    return <main>SSR public assets</main>;
  }
}
