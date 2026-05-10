import { CustomElement, Page, RenderMode, Route } from "mainz";

@CustomElement("x-mainz-fixture-document-language-home-page")
@Route("/")
@RenderMode("ssg")
export class FixtureDocumentLanguageHomePage extends Page {
  override head() {
    return {
      title: "Fixture Document Language",
    };
  }

  override render() {
    return (
      <section>
        <h1>Document-language fixture</h1>
        <p>Unlocalized routing with explicit document language.</p>
        <nav>
          <a href="/">Overview</a>
          <a href="/quickstart">Guides</a>
          <a href="/reference">Reference</a>
        </nav>
      </section>
    );
  }
}
