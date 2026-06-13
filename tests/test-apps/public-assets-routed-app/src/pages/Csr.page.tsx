import { Page, RenderMode, Route, script } from "mainz";

@Route("/csr")
@RenderMode("csr")
export class CsrPage extends Page {
  override assets() {
    return [
      script({
        id: "csr-docs-search",
        src: "/assets/docs-search.js",
        target: "body:end",
        strategy: "defer",
      }),
    ];
  }

  override render() {
    return <main>CSR public assets</main>;
  }
}
