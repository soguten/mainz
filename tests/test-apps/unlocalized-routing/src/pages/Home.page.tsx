import { CustomElement, Page, RenderMode, Route } from "mainz";

@CustomElement("x-mainz-fixture-unlocalized-routing-home-page")
@Route("/")
@RenderMode("ssg")
export class FixtureUnlocalizedRoutingHomePage extends Page {
  override head() {
    return {
      title: "Fixture Unlocalized Routing",
    };
  }

  override render() {
    return (
      <section>
        <h1>Unlocalized routing fixture</h1>
        <p>Unlocalized routing without app i18n.</p>
        <nav>
          <a href="/">Overview</a>
          <a href="/quickstart">Guides</a>
          <a href="/reference">Reference</a>
        </nav>
      </section>
    );
  }
}
