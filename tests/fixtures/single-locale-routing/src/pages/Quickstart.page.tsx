import { CustomElement, Locales, Page, RenderMode, Route } from "mainz";

@CustomElement("x-mainz-fixture-single-locale-quickstart-page")
@Route("/quickstart")
@RenderMode("ssg")
@Locales("en")
export class FixtureSingleLocaleQuickstartPage extends Page {
  override head() {
    return {
      title: "Fixture Quickstart",
    };
  }

  override render() {
    return (
      <article>
        <h1>Why Mainz</h1>
        <p>Create your first page.</p>
        <nav>
          <a href="/">Overview</a>
          <a href="/quickstart">Guides</a>
          <a href="/reference">Reference</a>
        </nav>
      </article>
    );
  }
}
