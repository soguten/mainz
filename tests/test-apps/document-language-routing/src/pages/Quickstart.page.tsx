import { CustomElement, Page, RenderMode, Route } from "mainz";

@CustomElement("x-mainz-fixture-document-language-quickstart-page")
@Route("/quickstart")
@RenderMode("csr")
export class FixtureDocumentLanguageQuickstartPage extends Page {
  override head() {
    return {
      title: "Fixture Document Language Quickstart",
    };
  }

  override render() {
    return (
      <article>
        <h1>Document language</h1>
        <p>The app declares document language without route i18n.</p>
        <nav>
          <a href="/">Overview</a>
          <a href="/quickstart">Guides</a>
          <a href="/reference">Reference</a>
        </nav>
      </article>
    );
  }
}
