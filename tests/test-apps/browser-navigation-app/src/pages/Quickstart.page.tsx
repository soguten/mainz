import { CustomElement, Page, RenderMode, Route } from "mainz";

@CustomElement("x-browser-navigation-quickstart")
@Route("/quickstart")
@RenderMode("csr")
export class QuickstartPage extends Page {
  override render() {
    return (
      <main>
        <h1>Quickstart step</h1>
        <a href="/">Home</a>
      </main>
    );
  }
}
