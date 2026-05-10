import { CustomElement, Locales, Page, RenderMode, Route } from "mainz";
import { buildLocaleHref } from "./shared.ts";

@CustomElement("x-mainz-fixture-base-path-home-page")
@Route("/")
@RenderMode("ssg")
@Locales("en", "pt")
export class FixtureBasePathHomePage extends Page {
  override head() {
    return {
      title: "Fixture Base Path",
    };
  }

  override render() {
    const locale = this.route.locale ?? "en";
    const isPortuguese = locale === "pt";

    return (
      <section>
        <h1>{isPortuguese ? "Inicio da fixture" : "Fixture home"}</h1>
        <p>
          {isPortuguese
            ? "Contrato de base path em portugues"
            : "Base path contract in English"}
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
      </section>
    );
  }
}
