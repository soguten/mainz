import { CustomElement, Page, RenderMode, Route } from "mainz";

@CustomElement("x-browser-navigation-home")
@Route("/")
@RenderMode("ssg")
export class HomePage extends Page {
  override render() {
    return (
      <main>
        <h1>Navigation home</h1>
        <a href="/quickstart">Quickstart</a>
      </main>
    );
  }
}
