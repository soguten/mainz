import { CustomElement, Page, RenderMode, Route } from "mainz";

@CustomElement("x-mainz-fixture-unlocalized-routing-quickstart-page")
@Route("/quickstart")
@RenderMode("csr")
export class FixtureUnlocalizedRoutingQuickstartPage extends Page {
  override metadata() {
    return {
      title: "Fixture Unlocalized Routing Quickstart",
    };
  }

  override render() {
    return (
      <article>
        <h1>Unlocalized routing</h1>
        <p>The app omits i18n and keeps locale routing inactive.</p>
        <nav>
          <a href="/">Overview</a>
          <a href="/quickstart">Guides</a>
          <a href="/reference">Reference</a>
        </nav>
      </article>
    );
  }
}

