import { CustomElement, Locales, Page, RenderMode, Route } from "mainz";
import { buildLocaleHref } from "./shared.ts";

@CustomElement("x-mainz-fixture-base-path-quickstart-page")
@Route("/quickstart")
@RenderMode("csr")
@Locales("en", "pt")
export class FixtureBasePathQuickstartPage extends Page {
  override head() {
    return {
      title: "Fixture Base Path Quickstart",
    };
  }

  override render() {
    const locale = this.route.locale ?? "en";
    const isPortuguese = locale === "pt";

    return (
      <article>
        <h1>
          {isPortuguese ? "Passo rapido da fixture" : "Fixture quickstart"}
        </h1>
        <p>
          {isPortuguese
            ? "Rota CSR com base path e localizacao real."
            : "CSR route with a real localized base path."}
        </p>
        <nav>
          <a
            className="locale-chip"
            data-locale="en"
            href={buildLocaleHref({ route: this.route, nextLocale: "en" })}
          >
            English
          </a>
          <a
            className="locale-chip"
            data-locale="pt"
            href={buildLocaleHref({ route: this.route, nextLocale: "pt" })}
          >
            Portugues
          </a>
        </nav>
      </article>
    );
  }
}
